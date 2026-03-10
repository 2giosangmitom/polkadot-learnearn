from fastapi import HTTPException, status


class UserNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )


class WalletAddressAlreadyExists(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this wallet address already exists.",
        )


class InvalidCredentials(HTTPException):
    """Signature verification failed or token is invalid."""

    def __init__(self, detail: str = "Invalid credentials.") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class TokenExpired(HTTPException):
    """JWT token has expired."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InsufficientPermissions(HTTPException):
    """User does not have permission for this action."""

    def __init__(self, detail: str = "Insufficient permissions.") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )
