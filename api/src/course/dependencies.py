from fastapi import Depends
from pydantic import UUID4
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.config import settings
from src.course import service
from src.course.exceptions import (
    CourseNotFound,
    LessonNotFound,
    PaymentRequired,
    QuizNotFound,
)
from src.course.models import Course, CoursePurchase, Lesson, Quiz
from src.database import get_session


async def valid_course_id(
    course_id: UUID4, session: AsyncSession = Depends(get_session)
) -> Course:
    """Validate that a course exists and return it."""
    course = await service.get_course_by_id(session, course_id)
    if not course:
        raise CourseNotFound()
    return course


async def valid_lesson_id(
    lesson_id: UUID4, session: AsyncSession = Depends(get_session)
) -> Lesson:
    """Validate that a lesson exists and return it."""
    lesson = await service.get_lesson_by_id(session, lesson_id)
    if not lesson:
        raise LessonNotFound()
    return lesson


async def valid_quiz_id(
    quiz_id: UUID4, session: AsyncSession = Depends(get_session)
) -> Quiz:
    """Validate that a quiz exists and return it.

    Used by the quiz answer submission endpoint (POST /quizzes/{quiz_id}/answers).
    """
    quiz = await session.get(Quiz, quiz_id)
    if not quiz:
        raise QuizNotFound()
    return quiz


async def require_course_purchase(
    course: Course = Depends(valid_course_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CoursePurchase:
    """Verify the authenticated user has purchased this course.

    Raises a 402 PaymentRequired with structured body if no purchase exists,
    allowing the x402 agent on the frontend to initiate the payment flow.

    Also allows the course author to access their own course content without
    purchasing.
    """
    # Course author can always access their own content
    if course.author_id == current_user.id:
        # Return a sentinel — the caller may check or ignore
        return None  # type: ignore[return-value]

    result = await session.exec(
        select(CoursePurchase).where(
            CoursePurchase.course_id == course.id,  # type: ignore[arg-type]
            CoursePurchase.user_id == current_user.id,  # type: ignore[arg-type]
        )
    )
    purchase = result.first()
    if not purchase:
        raise PaymentRequired(
            course_id=course.id,
            course_title=course.title,
            price=course.price,
            platform_wallet_address=settings.PLATFORM_WALLET_ADDRESS,
        )
    return purchase


async def require_lesson_purchase(
    lesson: Lesson = Depends(valid_lesson_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Lesson:
    """Verify the authenticated user has purchased the course that owns this lesson.

    Raises 402 PaymentRequired if no purchase exists.
    Returns the lesson if access is granted.
    """
    course = await service.get_course_by_id(session, lesson.course_id)
    if not course:
        raise CourseNotFound()

    # Course author can always access
    if course.author_id == current_user.id:
        return lesson

    result = await session.exec(
        select(CoursePurchase).where(
            CoursePurchase.course_id == course.id,  # type: ignore[arg-type]
            CoursePurchase.user_id == current_user.id,  # type: ignore[arg-type]
        )
    )
    purchase = result.first()
    if not purchase:
        raise PaymentRequired(
            course_id=course.id,
            course_title=course.title,
            price=course.price,
            platform_wallet_address=settings.PLATFORM_WALLET_ADDRESS,
        )
    return lesson
