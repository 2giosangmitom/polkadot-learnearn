import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.models import Role


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    wallet_address: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Unique blockchain wallet address.",
    )
    display_name: str = Field(
        ..., min_length=1, max_length=255, description="Display name shown in the UI."
    )
    role: Role = Field(..., description="User role: Teacher or Student.")


class UserUpdate(BaseModel):
    """Schema for partially updating a user."""

    display_name: str | None = Field(
        default=None, min_length=1, max_length=255, description="New display name."
    )
    role: Role | None = Field(default=None, description="New role.")


class UserResponse(BaseModel):
    """Schema returned when reading a user."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique user identifier.")
    wallet_address: str = Field(description="Blockchain wallet address.")
    display_name: str = Field(description="Display name.")
    role: Role = Field(description="User role.")
    created_at: datetime = Field(description="Account creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")


# ---------------------------------------------------------------------------
# Auth / JWT schemas
# ---------------------------------------------------------------------------


class ChallengeRequest(BaseModel):
    """Request a login challenge nonce."""

    address: str = Field(
        ..., min_length=1, description="SS58 wallet address requesting the challenge."
    )


class ChallengeResponse(BaseModel):
    """Challenge nonce to be signed by the wallet."""

    nonce: str = Field(description="Challenge message to sign.")


class LoginRequest(BaseModel):
    """Authenticate by providing a wallet signature over the challenge."""

    address: str = Field(..., min_length=1, description="SS58 wallet address.")
    signature: str = Field(
        ..., min_length=1, description="0x-prefixed hex signature from the wallet."
    )
    message: str = Field(
        ..., min_length=1, description="The original challenge nonce that was signed."
    )


class RegisterRequest(BaseModel):
    """Register a new user with wallet signature verification."""

    address: str = Field(..., min_length=1, description="SS58 wallet address.")
    signature: str = Field(
        ..., min_length=1, description="0x-prefixed hex signature from the wallet."
    )
    message: str = Field(
        ..., min_length=1, description="The original challenge nonce that was signed."
    )
    display_name: str = Field(
        ..., min_length=1, max_length=255, description="Display name."
    )
    role: Role = Field(..., description="User role: Teacher or Student.")


class AuthTokens(BaseModel):
    """JWT token pair."""

    access_token: str = Field(description="Short-lived access token.")
    refresh_token: str = Field(description="Long-lived refresh token.")
    token_type: str = Field(default="bearer", description="Token type.")


class AuthResponse(BaseModel):
    """Authentication response with tokens and user info."""

    tokens: AuthTokens = Field(description="JWT token pair.")
    user: UserResponse = Field(description="Authenticated user.")


class RefreshRequest(BaseModel):
    """Request new tokens using a valid refresh token."""

    refresh_token: str = Field(..., min_length=1, description="Current refresh token.")


class RefreshResponse(BaseModel):
    """New token pair after a successful refresh."""

    access_token: str = Field(description="New short-lived access token.")
    refresh_token: str = Field(description="New long-lived refresh token.")
    token_type: str = Field(default="bearer", description="Token type.")
