import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.auth.models import User


class Course(SQLModel, table=True):
    __tablename__ = "course"  # type: ignore[assignment]

    id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, primary_key=True, default=uuid.uuid4)
    )
    title: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    description: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    price: float
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

    author_id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, sa.ForeignKey("user.id"), nullable=False)
    )
    author: "User" = Relationship(back_populates="courses")
    lessons: List["Lesson"] = Relationship(
        back_populates="course",
        cascade_delete=True,
    )
    course_purchases: List["CoursePurchase"] = Relationship(
        back_populates="course",
        cascade_delete=True,
    )


class CoursePurchase(SQLModel, table=True):
    __tablename__ = "course_purchase"  # type: ignore[assignment]

    id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, primary_key=True, default=uuid.uuid4)
    )
    course_id: uuid.UUID = Field(
        sa_column=sa.Column(
            postgresql.UUID,
            sa.ForeignKey("course.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    user_id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, sa.ForeignKey("user.id"), nullable=False)
    )
    transaction_hash: str = Field(sa_column=sa.Column(sa.Text, nullable=False))

    course: "Course" = Relationship(back_populates="course_purchases")
    user: "User" = Relationship(back_populates="course_purchases")


class Lesson(SQLModel, table=True):
    __tablename__ = "lesson"  # type: ignore[assignment]

    id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, primary_key=True, default=uuid.uuid4)
    )
    title: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    description: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    video_url: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    payback_amount: float
    lesson_index: int = Field(
        sa_column=sa.Column(sa.Integer, nullable=False, default=0)
    )
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

    course_id: uuid.UUID = Field(
        sa_column=sa.Column(
            postgresql.UUID,
            sa.ForeignKey("course.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    course: "Course" = Relationship(back_populates="lessons")
    quizzes: List["Quiz"] = Relationship(
        back_populates="lesson",
        cascade_delete=True,
    )


class Quiz(SQLModel, table=True):
    __tablename__ = "quiz"  # type: ignore[assignment]

    id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, primary_key=True, default=uuid.uuid4)
    )
    question: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    option_a: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    option_b: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    option_c: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    option_d: str = Field(sa_column=sa.Column(sa.Text, nullable=False))
    correct_option: int = Field(sa_column=sa.Column(sa.SmallInteger, nullable=False))
    quiz_index: int = Field(sa_column=sa.Column(sa.Integer, nullable=False, default=0))
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

    lesson_id: uuid.UUID = Field(
        sa_column=sa.Column(
            postgresql.UUID,
            sa.ForeignKey("lesson.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    lesson: "Lesson" = Relationship(back_populates="quizzes")
    quiz_answers: List["QuizAnswer"] = Relationship(
        back_populates="quiz",
        cascade_delete=True,
    )


class QuizAnswer(SQLModel, table=True):
    __tablename__ = "quiz_answer"  # type: ignore[assignment]

    id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, primary_key=True, default=uuid.uuid4)
    )
    quiz_id: uuid.UUID = Field(
        sa_column=sa.Column(
            postgresql.UUID,
            sa.ForeignKey("quiz.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    selected_option: int = Field(sa_column=sa.Column(sa.SmallInteger, nullable=False))
    user_id: uuid.UUID = Field(
        sa_column=sa.Column(postgresql.UUID, sa.ForeignKey("user.id"), nullable=False)
    )

    quiz: "Quiz" = Relationship(back_populates="quiz_answers")
    user: "User" = Relationship(back_populates="quiz_answers")
