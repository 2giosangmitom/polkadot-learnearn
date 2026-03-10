import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship, SQLModel

from src.models import Role

if TYPE_CHECKING:
    from src.course.models import Course, CoursePurchase, PaybackTransaction, QuizAnswer


class User(SQLModel, table=True):
    __tablename__ = "user"  # type: ignore[assignment]

    id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, primary_key=True, default=uuid.uuid4)
    )
    wallet_address: str = Field(
        sa_column=sa.Column(sa.String, unique=True, nullable=False)
    )
    display_name: str
    role: Role = Field(sa_column=sa.Column(sa.Enum(Role), nullable=False))
    created_at: datetime | None = Field(
        default=None,
        sa_column=sa.Column(sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column=sa.Column(
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    courses: List["Course"] = Relationship(back_populates="author")
    course_purchases: List["CoursePurchase"] = Relationship(back_populates="user")
    quiz_answers: List["QuizAnswer"] = Relationship(back_populates="user")
    payback_transactions: List["PaybackTransaction"] = Relationship(
        back_populates="user"
    )
