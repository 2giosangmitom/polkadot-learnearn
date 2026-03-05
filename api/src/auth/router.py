from fastapi import APIRouter, Depends, Query, status
from pydantic import UUID4
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth import service
from src.auth.dependencies import valid_user_id
from src.auth.exceptions import WalletAddressAlreadyExists
from src.auth.models import User
from src.auth.schemas import UserCreate, UserResponse, UserUpdate
from src.database import get_session

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "",
    response_model=list[UserResponse],
    summary="List all users",
    description="Retrieve a paginated list of all registered users.",
    responses={
        status.HTTP_200_OK: {
            "description": "A list of users returned successfully.",
        },
    },
)
async def list_users(
    session: AsyncSession = Depends(get_session),
    offset: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return."
    ),
) -> list[User]:
    return await service.get_users(session, offset=offset, limit=limit)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get a user by ID",
    description="Retrieve a single user by their unique identifier.",
    responses={
        status.HTTP_200_OK: {"description": "User found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "User not found."},
    },
)
async def get_user(
    user: User = Depends(valid_user_id),
) -> User:
    return user


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description=(
        "Register a new user with a unique wallet address. "
        "Returns 409 if the wallet address is already registered."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "User created successfully."},
        status.HTTP_409_CONFLICT: {"description": "Wallet address already exists."},
    },
)
async def create_user(
    data: UserCreate,
    session: AsyncSession = Depends(get_session),
) -> User:
    existing = await service.get_user_by_wallet(session, data.wallet_address)
    if existing:
        raise WalletAddressAlreadyExists()
    return await service.create_user(session, data)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user",
    description="Partially update a user's display name or role. Only provided fields are updated.",
    responses={
        status.HTTP_200_OK: {"description": "User updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "User not found."},
    },
)
async def update_user(
    data: UserUpdate,
    user: User = Depends(valid_user_id),
    session: AsyncSession = Depends(get_session),
) -> User:
    return await service.update_user(session, user, data)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user",
    description="Permanently delete a user by their ID.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "User deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "User not found."},
    },
)
async def delete_user(
    user: User = Depends(valid_user_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_user(session, user)
