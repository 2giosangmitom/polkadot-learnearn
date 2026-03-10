from __future__ import annotations

import uuid

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import UUID4
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth import service
from src.auth.exceptions import (
    InsufficientPermissions,
    InvalidCredentials,
    TokenExpired,
    UserNotFound,
)
from src.auth.jwt import decode_token
from src.auth.models import User
from src.database import get_session
from src.models import Role

# Optional bearer – returns None when no token is provided
_bearer_scheme = HTTPBearer(auto_error=False)


async def valid_user_id(
    user_id: UUID4, session: AsyncSession = Depends(get_session)
) -> User:
    """Validate that a user with the given ID exists and return it."""
    user = await service.get_user_by_id(session, user_id)
    if not user:
        raise UserNotFound()
    return user


async def valid_wallet_address(
    wallet_address: str, session: AsyncSession = Depends(get_session)
) -> User:
    """Validate that a user with the given wallet address exists and return it."""
    user = await service.get_user_by_wallet(session, wallet_address)
    if not user:
        raise UserNotFound()
    return user


# ---------------------------------------------------------------------------
# JWT-based auth dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Extract and validate the JWT Bearer token, returning the authenticated user.

    Raises 401 if the token is missing, expired, or invalid.
    """
    if credentials is None:
        raise InvalidCredentials("Authentication required.")

    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise TokenExpired()
    except jwt.InvalidTokenError:
        raise InvalidCredentials("Invalid token.")

    if payload.get("type") != "access":
        raise InvalidCredentials("Invalid token type.")

    user_id = payload.get("sub")
    if not user_id:
        raise InvalidCredentials("Invalid token payload.")

    user = await service.get_user_by_id(session, uuid.UUID(user_id))
    if not user:
        raise InvalidCredentials("User no longer exists.")

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    """Same as ``get_current_user`` but returns ``None`` when no token is
    provided instead of raising 401.  Useful for public endpoints that
    optionally use auth context."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, session)
    except Exception:
        return None


def require_role(required_role: Role):
    """Factory that returns a dependency checking the user has *required_role*."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role != required_role:
            raise InsufficientPermissions(
                f"This action requires the {required_role.value} role."
            )
        return user

    return _check
