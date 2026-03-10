"""JWT token creation and validation utilities."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt

from src.config import settings


def create_access_token(
    user_id: uuid.UUID,
    wallet_address: str,
    role: str,
) -> str:
    """Create a short-lived access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "wallet": wallet_address,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_TTL),
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(user_id: uuid.UUID) -> str:
    """Create a longer-lived refresh token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_REFRESH_TOKEN_TTL),
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token.

    Raises ``jwt.ExpiredSignatureError`` or ``jwt.InvalidTokenError``
    on failure.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
