import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth import service
from src.auth.dependencies import get_current_user, valid_user_id, valid_wallet_address
from src.auth.exceptions import (
    InsufficientPermissions,
    InvalidCredentials,
    WalletAddressAlreadyExists,
)
from src.auth.jwt import create_access_token, create_refresh_token, decode_token
from src.auth.models import User
from src.auth.schemas import (
    AuthResponse,
    AuthTokens,
    ChallengeRequest,
    ChallengeResponse,
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    UserResponse,
    UserUpdate,
)
from src.auth.signature import generate_challenge, verify_signature
from src.database import get_session

router = APIRouter(prefix="/users", tags=["Users"])
auth_router = APIRouter(prefix="/auth", tags=["Auth"])


# ===========================================================================
# Auth endpoints
# ===========================================================================


@auth_router.post(
    "/challenge",
    response_model=ChallengeResponse,
    summary="Request a login challenge",
    description="Request a challenge nonce for the given wallet address. The client must sign this nonce and return it to authenticate.",
    responses={
        status.HTTP_200_OK: {"description": "Challenge nonce returned."},
    },
)
async def request_challenge(data: ChallengeRequest) -> ChallengeResponse:
    nonce = generate_challenge(data.address)
    return ChallengeResponse(nonce=nonce)


@auth_router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate with wallet signature",
    description=(
        "Verify the wallet signature over the challenge nonce and return JWT tokens. "
        "The user must already be registered."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Login successful."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Invalid signature."},
        status.HTTP_404_NOT_FOUND: {"description": "User not registered."},
    },
)
async def login(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    if not verify_signature(data.address, data.message, data.signature):
        raise InvalidCredentials("Signature verification failed.")

    user = await service.get_user_by_wallet(session, data.address)
    if not user:
        from src.auth.exceptions import UserNotFound

        raise UserNotFound()

    tokens = AuthTokens(
        access_token=create_access_token(user.id, user.wallet_address, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )
    return AuthResponse(tokens=tokens, user=UserResponse.model_validate(user))


@auth_router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register and authenticate with wallet signature",
    description=(
        "Verify the wallet signature, create a new user, and return JWT tokens. "
        "Returns 409 if the wallet address is already registered."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Registration successful."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Invalid signature."},
        status.HTTP_409_CONFLICT: {"description": "Wallet address already exists."},
    },
)
async def register(
    data: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    if not verify_signature(data.address, data.message, data.signature):
        raise InvalidCredentials("Signature verification failed.")

    existing = await service.get_user_by_wallet(session, data.address)
    if existing:
        raise WalletAddressAlreadyExists()

    from src.auth.schemas import UserCreate

    user = await service.create_user(
        session,
        UserCreate(
            wallet_address=data.address,
            display_name=data.display_name,
            role=data.role,
        ),
    )
    tokens = AuthTokens(
        access_token=create_access_token(user.id, user.wallet_address, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )
    return AuthResponse(tokens=tokens, user=UserResponse.model_validate(user))


@auth_router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh JWT tokens",
    description="Exchange a valid refresh token for a new access/refresh token pair.",
    responses={
        status.HTTP_200_OK: {"description": "Tokens refreshed."},
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Invalid or expired refresh token."
        },
    },
)
async def refresh_tokens(
    data: RefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> RefreshResponse:
    import jwt as pyjwt

    try:
        payload = decode_token(data.refresh_token)
    except pyjwt.ExpiredSignatureError:
        raise InvalidCredentials("Refresh token has expired.")
    except pyjwt.InvalidTokenError:
        raise InvalidCredentials("Invalid refresh token.")

    if payload.get("type") != "refresh":
        raise InvalidCredentials("Invalid token type.")

    user_id = payload.get("sub")
    if not user_id:
        raise InvalidCredentials("Invalid token payload.")

    user = await service.get_user_by_id(session, uuid.UUID(user_id))
    if not user:
        raise InvalidCredentials("User no longer exists.")

    return RefreshResponse(
        access_token=create_access_token(user.id, user.wallet_address, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )


@auth_router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Return the authenticated user from the JWT token.",
    responses={
        status.HTTP_200_OK: {"description": "Current user returned."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
    },
)
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user


# ===========================================================================
# User CRUD endpoints (backward compat — some now require auth)
# ===========================================================================


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
    "/wallet/{wallet_address}",
    response_model=UserResponse,
    summary="Get a user by wallet address",
    description="Retrieve a single user by their blockchain wallet address.",
    responses={
        status.HTTP_200_OK: {"description": "User found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "User not found."},
    },
)
async def get_user_by_wallet(
    user: User = Depends(valid_wallet_address),
) -> User:
    return user


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user",
    description="Partially update a user's display name or role. Only the user themselves can update their profile.",
    responses={
        status.HTTP_200_OK: {"description": "User updated successfully."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_403_FORBIDDEN: {"description": "Cannot update another user."},
        status.HTTP_404_NOT_FOUND: {"description": "User not found."},
    },
)
async def update_user(
    data: UserUpdate,
    user: User = Depends(valid_user_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    if user.id != current_user.id:
        raise InsufficientPermissions("You can only update your own profile.")
    return await service.update_user(session, user, data)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user",
    description="Permanently delete a user by their ID. Only the user themselves can delete their account.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "User deleted successfully."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_403_FORBIDDEN: {"description": "Cannot delete another user."},
        status.HTTP_404_NOT_FOUND: {"description": "User not found."},
    },
)
async def delete_user(
    user: User = Depends(valid_user_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    if user.id != current_user.id:
        raise InsufficientPermissions("You can only delete your own account.")
    await service.delete_user(session, user)
