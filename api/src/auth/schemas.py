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
