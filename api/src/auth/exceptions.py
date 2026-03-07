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
