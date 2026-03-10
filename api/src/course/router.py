from fastapi import APIRouter, Depends, Query, status
from pydantic import UUID4
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.dependencies import get_current_user, require_role
from src.auth.exceptions import InsufficientPermissions
from src.auth.models import User
from src.course import service
from src.course.dependencies import (
    require_lesson_purchase,
    valid_course_id,
    valid_lesson_id,
    valid_quiz_id,
)
from src.course.models import Course, CoursePurchase, Lesson, Quiz, QuizAnswer
from src.course.schemas import (
    CoursePurchaseCreate,
    CoursePurchaseResponse,
    CourseCreate,
    CourseProgressResponse,
    CourseResponse,
    CourseUpdate,
    CourseWithLessonsResponse,
    GenerateQuizFromDataRequest,
    GenerateQuizRequest,
    LessonProgressResponse,
    LessonResponse,
    PaybackTransactionResponse,
    QuizAnswerCreate,
    QuizAnswerResponse,
    QuizResponse,
    YouTubeMetadataResponse,
)
from src.database import get_session
from src.models import Role

# ===========================================================================
# Course router
# ===========================================================================
course_router = APIRouter(prefix="/courses", tags=["Courses"])


@course_router.get(
    "",
    response_model=list[CourseResponse],
    summary="List all courses",
    description="Retrieve a paginated list of all available courses. Public endpoint.",
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
) -> list[CourseResponse]:
    return await service.get_courses(session, offset=offset, limit=limit)


@course_router.get(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Get a course by ID",
    description="Retrieve a single course by its unique identifier. Public endpoint.",
    responses={
        status.HTTP_200_OK: {"description": "Course found and returned."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def get_course(
    course: Course = Depends(valid_course_id),
    session: AsyncSession = Depends(get_session),
) -> CourseResponse:
    return await service.get_course_response(session, course)


@course_router.post(
    "",
    response_model=CourseWithLessonsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a course with lessons",
    description=(
        "Create a new course together with all its lessons in a single request. "
        "Requires Teacher role. The author is set from the authenticated user's JWT. "
        "Validates that total lesson paybacks + platform fee do not exceed the course price."
    ),
    responses={
        status.HTTP_201_CREATED: {
            "description": "Course and lessons created successfully.",
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_403_FORBIDDEN: {"description": "Requires Teacher role."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error."},
    },
)
async def create_course(
    data: CourseCreate,
    current_user: User = Depends(require_role(Role.TEACHER)),
    session: AsyncSession = Depends(get_session),
) -> CourseWithLessonsResponse:
    return await service.create_course_with_lessons(session, data, current_user.id)


@course_router.put(
    "/{course_id}",
    response_model=CourseWithLessonsResponse,
    summary="Update a course with lessons",
    description=(
        "Update an existing course together with all its lessons in a single request. "
        "Requires Teacher role and course ownership. "
        "Lessons are synced to the desired state: new lessons are created, "
        "existing ones updated, and missing ones deleted."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Course and lessons updated successfully.",
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_403_FORBIDDEN: {"description": "Not the course author."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error."},
    },
)
async def update_course(
    data: CourseUpdate,
    course: Course = Depends(valid_course_id),
    current_user: User = Depends(require_role(Role.TEACHER)),
    session: AsyncSession = Depends(get_session),
) -> CourseWithLessonsResponse:
    if course.author_id != current_user.id:
        raise InsufficientPermissions("You can only update your own courses.")
    return await service.update_course_with_lessons(session, course, data)


@course_router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a course",
    description=(
        "Permanently delete a course and all associated data. "
        "Requires Teacher role and course ownership."
    ),
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Course deleted successfully."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_403_FORBIDDEN: {"description": "Not the course author."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def delete_course(
    course: Course = Depends(valid_course_id),
    current_user: User = Depends(require_role(Role.TEACHER)),
    session: AsyncSession = Depends(get_session),
) -> None:
    if course.author_id != current_user.id:
        raise InsufficientPermissions("You can only delete your own courses.")
    await service.delete_course(session, course)


# ===========================================================================
# Lesson router (nested under /courses/{course_id}/lessons)
# ===========================================================================
lesson_router = APIRouter(prefix="/courses/{course_id}/lessons", tags=["Lessons"])


@lesson_router.get(
    "",
    response_model=list[LessonResponse],
    summary="List lessons for a course",
    description=(
        "Retrieve a paginated list of lessons belonging to a specific course, "
        "ordered by lesson_index. Public endpoint (titles/descriptions visible for browsing)."
    ),
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


# Standalone lesson endpoint (get by ID — used by the lesson detail page)
# PROTECTED: requires course purchase or author access
lesson_detail_router = APIRouter(prefix="/lessons", tags=["Lessons"])


@lesson_detail_router.get(
    "/{lesson_id}",
    response_model=LessonResponse,
    summary="Get a lesson by ID",
    description=(
        "Retrieve a single lesson by its unique identifier. "
        "Requires authentication and course purchase (returns 402 if not purchased)."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Lesson found and returned."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_402_PAYMENT_REQUIRED: {"description": "Course not purchased."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def get_lesson(
    lesson: Lesson = Depends(require_lesson_purchase),
) -> Lesson:
    return lesson


# ===========================================================================
# Quiz router (nested under /lessons/{lesson_id}/quizzes)
# PROTECTED: requires course purchase or author access
# ===========================================================================
quiz_router = APIRouter(prefix="/lessons/{lesson_id}/quizzes", tags=["Quizzes"])


@quiz_router.get(
    "",
    response_model=list[QuizResponse],
    summary="List quizzes for a lesson",
    description=(
        "Retrieve a paginated list of quiz questions belonging to a specific lesson. "
        "Requires authentication and course purchase (returns 402 if not purchased)."
    ),
    responses={
        status.HTTP_200_OK: {"description": "A list of quizzes returned successfully."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_402_PAYMENT_REQUIRED: {"description": "Course not purchased."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def list_quizzes(
    lesson: Lesson = Depends(require_lesson_purchase),
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
    "/generate",
    response_model=list[QuizResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate quiz questions with AI",
    description=(
        "Use AI to automatically generate multiple-choice quiz questions for a lesson. "
        "Requires Teacher role and course ownership."
    ),
    responses={
        status.HTTP_201_CREATED: {
            "description": "Quiz questions generated and saved successfully.",
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_403_FORBIDDEN: {"description": "Not the course author."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
        status.HTTP_502_BAD_GATEWAY: {"description": "AI generation failed."},
    },
)
async def generate_quizzes(
    lesson: Lesson = Depends(valid_lesson_id),
    current_user: User = Depends(require_role(Role.TEACHER)),
    session: AsyncSession = Depends(get_session),
    body: GenerateQuizRequest = GenerateQuizRequest(),
) -> list[Quiz]:
    # Verify ownership: the lesson's course must belong to the current user
    course = await service.get_course_by_id(session, lesson.course_id)
    if not course or course.author_id != current_user.id:
        raise InsufficientPermissions(
            "You can only generate quizzes for your own courses."
        )
    return await service.gen_quiz(session, lesson, num_questions=body.num_questions)


# ===========================================================================
# QuizAnswer router — requires auth
# ===========================================================================
quiz_answer_router = APIRouter(
    prefix="/quizzes/{quiz_id}/answers", tags=["Quiz Answers"]
)


@quiz_answer_router.post(
    "",
    response_model=QuizAnswerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a quiz answer",
    description=(
        "Submit a student's answer to a quiz question. "
        "Requires authentication. The user_id is taken from the JWT token. "
        "If the student has now passed the lesson (scored >= 70% on all quizzes), "
        "a payback transfer is automatically sent on-chain."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Answer submitted successfully."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_404_NOT_FOUND: {"description": "Quiz not found."},
    },
)
async def create_quiz_answer(
    data: QuizAnswerCreate,
    quiz: Quiz = Depends(valid_quiz_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> QuizAnswer:
    return await service.create_quiz_answer(session, data, current_user.id)


# ===========================================================================
# Progress router (quiz results + course progress) — requires auth
# ===========================================================================
progress_router = APIRouter(prefix="", tags=["Progress"])


@progress_router.get(
    "/lessons/{lesson_id}/progress",
    response_model=LessonProgressResponse,
    summary="Get quiz results for a lesson",
    description=(
        "Retrieve the authenticated user's quiz results for a specific lesson, "
        "including per-question correctness, overall score, and payback status."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Lesson progress returned."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_404_NOT_FOUND: {"description": "Lesson not found."},
    },
)
async def get_lesson_progress(
    lesson: Lesson = Depends(valid_lesson_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LessonProgressResponse:
    return await service.get_lesson_progress(session, lesson.id, current_user.id)


@progress_router.get(
    "/courses/{course_id}/progress",
    response_model=CourseProgressResponse,
    summary="Get course progress for the authenticated user",
    description=(
        "Retrieve the authenticated user's overall progress for a course, "
        "including per-lesson completion status, total PAS earned, and payback status."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Course progress returned."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
    },
)
async def get_course_progress(
    course: Course = Depends(valid_course_id),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CourseProgressResponse:
    return await service.get_course_progress(session, course.id, current_user.id)


# ===========================================================================
# CoursePurchase router — requires auth
# ===========================================================================
purchase_router = APIRouter(prefix="/purchases", tags=["Course Purchases"])


@purchase_router.get(
    "",
    response_model=list[CoursePurchaseResponse],
    summary="List purchases for the authenticated user",
    description=(
        "Retrieve a paginated list of course purchases for the authenticated user. "
        "Optionally filter by course_id."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "A list of purchases returned successfully."
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
    },
)
async def list_purchases(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    course_id: UUID4 | None = Query(
        default=None, description="Filter purchases by course ID."
    ),
    offset: int = Query(default=0, ge=0, description="Number of records to skip."),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Maximum number of records to return."
    ),
) -> list[CoursePurchase]:
    if course_id:
        # Return only the current user's purchases for this course
        from sqlmodel import select
        from src.course.models import CoursePurchase as CP

        result = await session.exec(
            select(CP)
            .where(
                CP.course_id == course_id,  # type: ignore[arg-type]
                CP.user_id == current_user.id,  # type: ignore[arg-type]
            )
            .offset(offset)
            .limit(limit)
        )
        return list(result.all())
    return await service.get_purchases_by_user(
        session, current_user.id, offset=offset, limit=limit
    )


@purchase_router.post(
    "",
    response_model=CoursePurchaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Purchase a course (on-chain verified)",
    description=(
        "Record a course purchase after an on-chain payment to the platform wallet. "
        "The server uses a Polkadot light client to locate the transaction "
        "in recent finalized blocks and verify that a ``Balances.Transfer`` "
        "to the platform wallet for at least the course price exists.\n\n"
        "After verification, the server automatically:\n"
        "1. Calculates the fee split (platform fee + payback reserve + teacher share)\n"
        "2. Sends the teacher's share on-chain from the platform wallet\n"
        "3. Records the purchase\n\n"
        "Returns **402 Payment Required** if the transaction is not found "
        "or the payment does not match."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Purchase verified and recorded."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_402_PAYMENT_REQUIRED: {
            "description": "Transaction not found on-chain or payment verification failed.",
        },
        status.HTTP_404_NOT_FOUND: {"description": "Course not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error."},
    },
)
async def create_purchase(
    data: CoursePurchaseCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CoursePurchase:
    # Resolve the course to get its price for verification
    course = await service.get_course_by_id(session, data.course_id)
    if not course:
        from src.course.exceptions import CourseNotFound

        raise CourseNotFound()
    return await service.create_purchase(session, data, course, current_user.id)


# ===========================================================================
# YouTube Utilities (public)
# ===========================================================================


@course_router.get(
    "/youtube/metadata",
    response_model=YouTubeMetadataResponse,
    summary="Get YouTube video metadata",
    description="Extract title, description, and other metadata from a YouTube URL.",
    responses={
        status.HTTP_200_OK: {"description": "YouTube metadata retrieved successfully."},
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid YouTube URL."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error."},
    },
)
async def get_youtube_metadata(
    url: str = Query(..., description="YouTube video URL"),
) -> YouTubeMetadataResponse:
    """Get metadata for a YouTube video."""
    from src.ai.subtitles import fetch_youtube_metadata

    metadata = await fetch_youtube_metadata(url)

    if metadata is None:
        return YouTubeMetadataResponse(
            title="",
            description="",
            duration=None,
            uploader=None,
            upload_date=None,
            success=False,
        )

    return YouTubeMetadataResponse(
        title=metadata["title"],
        description=metadata["description"],
        duration=metadata["duration"],
        uploader=metadata["uploader"],
        upload_date=metadata["upload_date"],
        success=True,
    )


@course_router.post(
    "/quizzes/generate-from-data",
    response_model=list[dict],
    status_code=status.HTTP_200_OK,
    summary="Generate quiz questions with AI from lesson data",
    description=(
        "Use AI to automatically generate multiple-choice quiz questions from lesson data. "
        "The AI uses the lesson title, description, and YouTube video subtitles "
        "(when available) to create high-quality questions.\n\n"
        "This endpoint does NOT save quizzes to the database - it returns preview data only. "
        "Requires Teacher role. "
        "Returns **502 Bad Gateway** if the AI provider fails."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Quiz questions generated successfully (not saved to database).",
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Not authenticated."},
        status.HTTP_403_FORBIDDEN: {"description": "Requires Teacher role."},
        status.HTTP_502_BAD_GATEWAY: {"description": "AI generation failed."},
    },
)
async def generate_quizzes_from_data(
    body: GenerateQuizFromDataRequest,
    current_user: User = Depends(require_role(Role.TEACHER)),
) -> list[dict]:
    return await service.gen_quiz_from_data(
        title=body.title,
        description=body.description,
        video_url=body.video_url,
        num_questions=body.num_questions,
    )
