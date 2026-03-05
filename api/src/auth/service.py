import uuid

from pydantic import UUID4
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.models import User
from src.auth.schemas import UserCreate, UserUpdate


async def get_users(
    session: AsyncSession, *, offset: int = 0, limit: int = 100
) -> list[User]:
    result = await session.exec(select(User).offset(offset).limit(limit))
    return list(result.all())


async def get_user_by_id(session: AsyncSession, user_id: UUID4) -> User | None:
    return await session.get(User, user_id)


async def get_user_by_wallet(session: AsyncSession, wallet_address: str) -> User | None:
    result = await session.exec(
        select(User).where(User.wallet_address == wallet_address)  # type: ignore[arg-type]
    )
    return result.first()


async def create_user(session: AsyncSession, data: UserCreate) -> User:
    user = User(
        id=uuid.uuid4(),
        wallet_address=data.wallet_address,
        display_name=data.display_name,
        role=data.role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def update_user(session: AsyncSession, user: User, data: UserUpdate) -> User:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def delete_user(session: AsyncSession, user: User) -> None:
    await session.delete(user)
    await session.commit()
