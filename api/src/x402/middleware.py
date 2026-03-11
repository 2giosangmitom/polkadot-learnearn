"""x402 middleware for FastAPI.

Two-part integration:

1. **Exception handler** — registered on the FastAPI app — catches
   ``PaymentRequired`` exceptions and returns a proper 402 response with
   the ``PAYMENT-REQUIRED`` header (Base64-encoded JSON).

2. **ASGI middleware** — intercepts incoming requests that carry a
   ``PAYMENT-SIGNATURE`` header. It decodes the payload, verifies the
   on-chain payment, records the purchase, and injects the original user
   context so the downstream route handler can proceed normally. On
   success it also sets the ``PAYMENT-RESPONSE`` header on the outgoing
   response.

Usage (in ``main.py``)::

    from src.x402.middleware import add_x402_support
    add_x402_support(app)
"""

from __future__ import annotations

import base64
import json
import logging
import re
import uuid
from typing import Any

import jwt as pyjwt
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from src.auth.jwt import decode_token
from src.auth import service as auth_service
from src.config import settings
from src.course import service as course_service
from src.course.exceptions import PaymentRequired
from src.course.models import Course, CoursePurchase, Lesson
from src.database import engine
from src.x402.polkadot_scheme import verify_and_settle
from src.x402.types import (
    PaymentPayload,
    PaymentRequired as X402PaymentRequired,
    PaymentRequirements,
    ResourceInfo,
    SettleResponse,
)

logger = logging.getLogger(__name__)

# Routes protected by x402 — must match ``require_lesson_purchase`` routes
_LESSON_DETAIL_RE = re.compile(r"^/lessons/([^/]+)$")
_LESSON_QUIZZES_RE = re.compile(r"^/lessons/([^/]+)/quizzes$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _b64_encode(obj: dict | Any) -> str:
    """JSON-serialise and Base64-encode (no padding, URL-safe)."""
    raw = json.dumps(obj, separators=(",", ":")).encode()
    return base64.b64encode(raw).decode()


def _b64_decode(value: str) -> dict:
    """Base64-decode and JSON-parse."""
    # Be lenient with padding
    padded = value + "=" * (-len(value) % 4)
    raw = base64.b64decode(padded)
    return json.loads(raw)


def _build_payment_required(
    request: Request,
    course: Course,
) -> X402PaymentRequired:
    """Build the ``PaymentRequired`` payload for a course."""
    min_amount = int(course.price * (10**settings.TOKEN_DECIMALS))
    return X402PaymentRequired(
        x402Version=2,
        resource=ResourceInfo(
            url=str(request.url),
            description=f"Access to course: {course.title}",
            mimeType="application/json",
        ),
        accepts=[
            PaymentRequirements(
                scheme="exact",
                network=f"polkadot:{settings.NETWORK}",
                maxAmountRequired=str(min_amount),
                asset="PAS",
                payTo=settings.PLATFORM_WALLET_ADDRESS,
                maxTimeoutSeconds=300,
                extra={
                    "courseId": str(course.id),
                    "courseTitle": course.title,
                    "price": course.price,
                },
            )
        ],
    )


# ---------------------------------------------------------------------------
# Exception handler — converts PaymentRequired into x402 402 response
# ---------------------------------------------------------------------------


async def _payment_required_handler(
    request: Request, exc: PaymentRequired
) -> JSONResponse:
    """Convert the old-style ``PaymentRequired`` exception into an x402 402.

    The ``PaymentRequired`` exception carries ``course_id``, ``course_title``,
    ``price``, and ``platform_wallet_address`` in its ``detail`` dict.
    """
    detail: dict = exc.detail  # type: ignore[assignment]
    course_id = detail.get("course_id", "")
    course_title = detail.get("course_title", "")
    price = detail.get("price", 0)
    platform_wallet = detail.get(
        "platform_wallet_address", settings.PLATFORM_WALLET_ADDRESS
    )

    min_amount = int(price * (10**settings.TOKEN_DECIMALS))

    payload = X402PaymentRequired(
        x402Version=2,
        resource=ResourceInfo(
            url=str(request.url),
            description=f"Access to course: {course_title}",
            mimeType="application/json",
        ),
        accepts=[
            PaymentRequirements(
                scheme="exact",
                network=f"polkadot:{settings.NETWORK}",
                maxAmountRequired=str(min_amount),
                asset="PAS",
                payTo=platform_wallet,
                maxTimeoutSeconds=300,
                extra={
                    "courseId": course_id,
                    "courseTitle": course_title,
                    "price": price,
                },
            )
        ],
    )

    encoded = _b64_encode(payload.model_dump())

    return JSONResponse(
        status_code=402,
        content={"error": "Payment Required", "x402Version": 2},
        headers={"PAYMENT-REQUIRED": encoded},
    )


# ---------------------------------------------------------------------------
# Middleware — handles incoming PAYMENT-SIGNATURE headers
# ---------------------------------------------------------------------------


class X402Middleware(BaseHTTPMiddleware):
    """Process ``PAYMENT-SIGNATURE`` headers on x402-protected routes.

    If the header is present:
    1. Decode it (Base64 → JSON → ``PaymentPayload``).
    2. Extract the user from the JWT ``Authorization`` header.
    3. Identify the course from the lesson in the URL.
    4. Call ``verify_and_settle`` to confirm on-chain and record the purchase.
    5. If successful, let the request proceed and add ``PAYMENT-RESPONSE`` header.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        payment_sig = request.headers.get("PAYMENT-SIGNATURE") or request.headers.get(
            "payment-signature"
        )

        if not payment_sig:
            return await call_next(request)

        # Only process on x402-protected routes
        path = request.url.path
        lesson_match = _LESSON_DETAIL_RE.match(path) or _LESSON_QUIZZES_RE.match(path)
        if not lesson_match:
            return await call_next(request)

        lesson_id_str = lesson_match.group(1)

        # Decode the PAYMENT-SIGNATURE header
        try:
            decoded = _b64_decode(payment_sig)
            payload = PaymentPayload(**decoded)
        except (ValidationError, Exception) as exc:
            logger.warning("Invalid PAYMENT-SIGNATURE header: %s", exc)
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid PAYMENT-SIGNATURE header: {exc}"},
            )

        # Extract user from JWT
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"error": "Authentication required for x402 payment."},
            )

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            jwt_payload = decode_token(token)
        except pyjwt.ExpiredSignatureError:
            return JSONResponse(status_code=401, content={"error": "Token expired."})
        except pyjwt.InvalidTokenError:
            return JSONResponse(status_code=401, content={"error": "Invalid token."})

        if jwt_payload.get("type") != "access":
            return JSONResponse(
                status_code=401, content={"error": "Invalid token type."}
            )

        user_id_str = jwt_payload.get("sub")
        if not user_id_str:
            return JSONResponse(
                status_code=401, content={"error": "Invalid token payload."}
            )

        user_id = uuid.UUID(user_id_str)

        # Open a DB session, look up the lesson → course, then verify & settle
        settle_result: SettleResponse | None = None
        async with AsyncSession(engine) as session:
            # Verify user exists
            user = await auth_service.get_user_by_id(session, user_id)
            if not user:
                return JSONResponse(
                    status_code=401, content={"error": "User no longer exists."}
                )

            # Check if the lesson exists
            lesson = await course_service.get_lesson_by_id(
                session, uuid.UUID(lesson_id_str)
            )
            if not lesson:
                return JSONResponse(
                    status_code=404, content={"error": "Lesson not found."}
                )

            # Check if already purchased (no double-charge)
            result = await session.exec(
                select(CoursePurchase).where(
                    CoursePurchase.course_id == lesson.course_id,  # type: ignore[arg-type]
                    CoursePurchase.user_id == user_id,  # type: ignore[arg-type]
                )
            )
            existing = result.first()
            if existing:
                # Already purchased — just proceed, no need to settle again
                response = await call_next(request)
                return response

            # Look up the course
            course = await course_service.get_course_by_id(session, lesson.course_id)
            if not course:
                return JSONResponse(
                    status_code=404, content={"error": "Course not found."}
                )

            # Verify and settle
            try:
                settle_result = await verify_and_settle(
                    payload, course, user_id, session
                )
            except ValueError as exc:
                return JSONResponse(
                    status_code=402,
                    content={"error": str(exc)},
                )
            except Exception as exc:
                logger.exception("x402 verify_and_settle failed unexpectedly")
                return JSONResponse(
                    status_code=502,
                    content={
                        "error": "Payment verification failed due to a server error. "
                        "Your transaction may have succeeded on-chain. "
                        "Please try again or contact support.",
                    },
                )

        # Payment settled — let the original request proceed
        # The downstream ``require_lesson_purchase`` will now find the purchase
        response = await call_next(request)

        # Add PAYMENT-RESPONSE header
        if settle_result:
            encoded_response = _b64_encode(settle_result.model_dump())
            response.headers["PAYMENT-RESPONSE"] = encoded_response

        return response


# ---------------------------------------------------------------------------
# Registration helper
# ---------------------------------------------------------------------------


def add_x402_support(app: FastAPI) -> None:
    """Register the x402 exception handler and middleware on the app."""
    app.add_exception_handler(PaymentRequired, _payment_required_handler)  # type: ignore[arg-type]
    app.add_middleware(X402Middleware)
