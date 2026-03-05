from fastapi import APIRouter, Depends, Query, status
from pydantic import UUID4
from sqlmodel.ext.asyncio.session import AsyncSession

from src.course import service
from src.course.dependencies import (
    valid_course_id,
    valid_lesson_id,
    valid_purchase_id,
    valid_quiz_answer_id,
    valid_quiz_id,
)
from src.course.models import Course, CoursePurchase, Lesson, Quiz, QuizAnswer
from src.course.schemas import (
    CourseCreate,
    CoursePurchaseCreate,
    CoursePurchaseResponse,
    CourseResponse,
    CourseUpdate,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    QuizAnswerCreate,
    QuizAnswerResponse,
    QuizCreate,
    QuizResponse,
    QuizUpdate,
)
from src.database import get_session

# ===========================================================================
# Course router
# ===========================================================================
course_router = APIRouter(prefix="/courses", tags=["Courses"])


@course_router.get(
    "",
    response_model=list[CourseResponse],
    summary="List all courses",
    description="Retrieve a paginated list of all available courses.",
    responses={
        status.HTTP_200_OK: {"description": "A list of courses returned successfully."},
    },
)
async def list_courses(
    session: AsyncSession = Depends(get_session),
    offset: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return."
    ),
) -> list[Course]:
    return await service.get_courses(session, offset=offset, limit=limit)


@course_router.get(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Get a course by ID",
    description="Retrieve a single course by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"description": "Course found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def get_course(
    course: Course = Depends(valid_course_id),
) -> Course:
    return course


@course_router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course",
    description="Create a new course authored by a teacher. The author_id must reference an existing user.",
    responses={
        status.HTTP_201_CREATED: {"description": "Course created successfully."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error."},
    },
)
async def create_course(
    data: CourseCreate,
    session: AsyncSession = Depends(get_session),
) -> Course:
    return await service.create_course(session, data)


@course_router.patch(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Update a course",
    description="Partially update a course's title, description, or price. Only provided fields are changed.",
    responses={
        status.HTTP_200_OK: {"description": "Course updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def update_course(
    data: CourseUpdate,
    course: Course = Depends(valid_course_id),
    session: AsyncSession = Depends(get_session),
) -> Course:
    return await service.update_course(session, course, data)


@course_router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a course",
    description="Permanently delete a course and all associated data.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Course deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def delete_course(
    course: Course = Depends(valid_course_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_course(session, course)


# ===========================================================================
# Lesson router (nested under /courses/{course_id}/lessons)
# ===========================================================================
lesson_router = APIRouter(prefix="/courses/{course_id}/lessons", tags=["Lessons"])


@lesson_router.get(
    "",
    response_model=list[LessonResponse],
    summary="List lessons for a course",
    description="Retrieve a paginated list of lessons belonging to a specific course.",
    responses={
        status.HTTP_200_OK: {"description": "A list of lessons returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def list_lessons(
    course: Course = Depends(valid_course_id),
    session: AsyncSession = Depends(get_session),
    offset: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return."
    ),
) -> list[Lesson]:
    return await service.get_lessons_by_course(
        session, course.id, offset=offset, limit=limit
    )


@lesson_router.post(
    "",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a lesson",
    description="Add a new lesson to an existing course.",
    responses={
        status.HTTP_201_CREATED: {"description": "Lesson created successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def create_lesson(
    data: LessonCreate,
    course: Course = Depends(valid_course_id),
    session: AsyncSession = Depends(get_session),
) -> Lesson:
    return await service.create_lesson(session, course.id, data)


# Standalone lesson endpoints (for update/delete/get by lesson_id)
lesson_detail_router = APIRouter(prefix="/lessons", tags=["Lessons"])


@lesson_detail_router.get(
    "/{lesson_id}",
    response_model=LessonResponse,
    summary="Get a lesson by ID",
    description="Retrieve a single lesson by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"description": "Lesson found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def get_lesson(
    lesson: Lesson = Depends(valid_lesson_id),
) -> Lesson:
    return lesson


@lesson_detail_router.patch(
    "/{lesson_id}",
    response_model=LessonResponse,
    summary="Update a lesson",
    description="Partially update a lesson's title, description, video URL, or payback amount.",
    responses={
        status.HTTP_200_OK: {"description": "Lesson updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def update_lesson(
    data: LessonUpdate,
    lesson: Lesson = Depends(valid_lesson_id),
    session: AsyncSession = Depends(get_session),
) -> Lesson:
    return await service.update_lesson(session, lesson, data)


@lesson_detail_router.delete(
    "/{lesson_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a lesson",
    description="Permanently delete a lesson and its quizzes.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Lesson deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def delete_lesson(
    lesson: Lesson = Depends(valid_lesson_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_lesson(session, lesson)


# ===========================================================================
# Quiz router (nested under /lessons/{lesson_id}/quizzes)
# ===========================================================================
quiz_router = APIRouter(prefix="/lessons/{lesson_id}/quizzes", tags=["Quizzes"])


@quiz_router.get(
    "",
    response_model=list[QuizResponse],
    summary="List quizzes for a lesson",
    description="Retrieve a paginated list of quiz questions belonging to a specific lesson.",
    responses={
        status.HTTP_200_OK: {"description": "A list of quizzes returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def list_quizzes(
    lesson: Lesson = Depends(valid_lesson_id),
    session: AsyncSession = Depends(get_session),
    offset: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return."
    ),
) -> list[Quiz]:
    return await service.get_quizzes_by_lesson(
        session, lesson.id, offset=offset, limit=limit
    )


@quiz_router.post(
    "",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a quiz question",
    description=(
        "Add a new multiple-choice quiz question to a lesson. "
        "Each quiz has four options (A-D) and one correct answer."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Quiz created successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def create_quiz(
    data: QuizCreate,
    lesson: Lesson = Depends(valid_lesson_id),
    session: AsyncSession = Depends(get_session),
) -> Quiz:
    return await service.create_quiz(session, lesson.id, data)


# Standalone quiz endpoints
quiz_detail_router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@quiz_detail_router.get(
    "/{quiz_id}",
    response_model=QuizResponse,
    summary="Get a quiz by ID",
    description="Retrieve a single quiz question by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"description": "Quiz found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "Quiz not found."},
    },
)
async def get_quiz(
    quiz: Quiz = Depends(valid_quiz_id),
) -> Quiz:
    return quiz


@quiz_detail_router.patch(
    "/{quiz_id}",
    response_model=QuizResponse,
    summary="Update a quiz question",
    description="Partially update a quiz question's text, options, or correct answer.",
    responses={
        status.HTTP_200_OK: {"description": "Quiz updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Quiz not found."},
    },
)
async def update_quiz(
    data: QuizUpdate,
    quiz: Quiz = Depends(valid_quiz_id),
    session: AsyncSession = Depends(get_session),
) -> Quiz:
    return await service.update_quiz(session, quiz, data)


@quiz_detail_router.delete(
    "/{quiz_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a quiz question",
    description="Permanently delete a quiz question and all associated answers.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Quiz deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Quiz not found."},
    },
)
async def delete_quiz(
    quiz: Quiz = Depends(valid_quiz_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_quiz(session, quiz)


# ===========================================================================
# QuizAnswer router
# ===========================================================================
quiz_answer_router = APIRouter(
    prefix="/quizzes/{quiz_id}/answers", tags=["Quiz Answers"]
)


@quiz_answer_router.get(
    "",
    response_model=list[QuizAnswerResponse],
    summary="List answers for a quiz",
    description="Retrieve a paginated list of submitted answers for a specific quiz question.",
    responses={
        status.HTTP_200_OK: {"description": "A list of answers returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Quiz not found."},
    },
)
async def list_quiz_answers(
    quiz: Quiz = Depends(valid_quiz_id),
    session: AsyncSession = Depends(get_session),
    offset: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return."
    ),
) -> list[QuizAnswer]:
    return await service.get_quiz_answers_by_quiz(
        session, quiz.id, offset=offset, limit=limit
    )


@quiz_answer_router.post(
    "",
    response_model=QuizAnswerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a quiz answer",
    description=(
        "Submit a student's answer to a quiz question. "
        "The selected_option must be between 1 and 4 (A=1, B=2, C=3, D=4)."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Answer submitted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Quiz not found."},
    },
)
async def create_quiz_answer(
    data: QuizAnswerCreate,
    quiz: Quiz = Depends(valid_quiz_id),
    session: AsyncSession = Depends(get_session),
) -> QuizAnswer:
    return await service.create_quiz_answer(session, data)


quiz_answer_detail_router = APIRouter(prefix="/quiz-answers", tags=["Quiz Answers"])


@quiz_answer_detail_router.get(
    "/{answer_id}",
    response_model=QuizAnswerResponse,
    summary="Get a quiz answer by ID",
    description="Retrieve a single quiz answer by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"description": "Answer found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "Answer not found."},
    },
)
async def get_quiz_answer(
    answer: QuizAnswer = Depends(valid_quiz_answer_id),
) -> QuizAnswer:
    return answer


@quiz_answer_detail_router.delete(
    "/{answer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a quiz answer",
    description="Permanently delete a submitted quiz answer.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Answer deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Answer not found."},
    },
)
async def delete_quiz_answer(
    answer: QuizAnswer = Depends(valid_quiz_answer_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_quiz_answer(session, answer)


# ===========================================================================
# CoursePurchase router
# ===========================================================================
purchase_router = APIRouter(prefix="/purchases", tags=["Course Purchases"])


@purchase_router.get(
    "",
    response_model=list[CoursePurchaseResponse],
    summary="List purchases by course or user",
    description=(
        "Retrieve a paginated list of course purchases. "
        "Filter by course_id or user_id (at least one must be provided)."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "A list of purchases returned successfully."
        },
    },
)
async def list_purchases(
    session: AsyncSession = Depends(get_session),
    course_id: UUID4 | None = Query(
        default=None, description="Filter purchases by course ID."
    ),
    user_id: UUID4 | None = Query(
        default=None, description="Filter purchases by user ID."
    ),
    offset: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return."
    ),
) -> list[CoursePurchase]:
    if course_id:
        return await service.get_purchases_by_course(
            session, course_id, offset=offset, limit=limit
        )
    if user_id:
        return await service.get_purchases_by_user(
            session, user_id, offset=offset, limit=limit
        )
    # If neither filter provided, return empty list rather than all purchases
    return []


@purchase_router.get(
    "/{purchase_id}",
    response_model=CoursePurchaseResponse,
    summary="Get a purchase by ID",
    description="Retrieve a single course purchase record by its unique identifier.",
    responses={
        status.HTTP_200_OK: {"description": "Purchase found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "Purchase not found."},
    },
)
async def get_purchase(
    purchase: CoursePurchase = Depends(valid_purchase_id),
) -> CoursePurchase:
    return purchase


@purchase_router.post(
    "",
    response_model=CoursePurchaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Purchase a course (on-chain verified)",
    description=(
        "Record a course purchase after an on-chain payment. "
        "The server uses a Polkadot light client to locate the transaction "
        "in recent finalized blocks and verify that a ``Balances.Transfer`` "
        "to the platform recipient for at least the course price exists.\n\n"
        "Returns **402 Payment Required** if the transaction is not found "
        "or the payment does not match."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Purchase verified and recorded."},
        status.HTTP_402_PAYMENT_REQUIRED: {
            "description": "Transaction not found on-chain or payment verification failed.",
        },
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error."},
    },
)
async def create_purchase(
    data: CoursePurchaseCreate,
    session: AsyncSession = Depends(get_session),
) -> CoursePurchase:
    # Resolve the course to get its price for verification
    course = await service.get_course_by_id(session, data.course_id)
    if not course:
        from src.course.exceptions import CourseNotFound

        raise CourseNotFound()
    return await service.create_purchase(session, data, course)


@purchase_router.delete(
    "/{purchase_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a purchase record",
    description="Permanently delete a course purchase record.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Purchase deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Purchase not found."},
    },
)
async def delete_purchase(
    purchase: CoursePurchase = Depends(valid_purchase_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_purchase(session, purchase)
