from fastapi import Depends
from pydantic import UUID4
from sqlmodel.ext.asyncio.session import AsyncSession

from src.course import service
from src.course.exceptions import (
    CourseNotFound,
    CoursePurchaseNotFound,
    LessonNotFound,
    QuizAnswerNotFound,
    QuizNotFound,
)
from src.course.models import Course, CoursePurchase, Lesson, Quiz, QuizAnswer
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
    """Validate that a quiz exists and return it."""
    quiz = await service.get_quiz_by_id(session, quiz_id)
    if not quiz:
        raise QuizNotFound()
    return quiz


async def valid_quiz_answer_id(
    answer_id: UUID4, session: AsyncSession = Depends(get_session)
) -> QuizAnswer:
    """Validate that a quiz answer exists and return it."""
    answer = await service.get_quiz_answer_by_id(session, answer_id)
    if not answer:
        raise QuizAnswerNotFound()
    return answer


async def valid_purchase_id(
    purchase_id: UUID4, session: AsyncSession = Depends(get_session)
) -> CoursePurchase:
    """Validate that a course purchase exists and return it."""
    purchase = await service.get_purchase_by_id(session, purchase_id)
    if not purchase:
        raise CoursePurchaseNotFound()
    return purchase
