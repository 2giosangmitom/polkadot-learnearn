from fastapi import Depends
from pydantic import UUID4
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth import service
from src.auth.exceptions import UserNotFound
from src.auth.models import User
from src.database import get_session


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
