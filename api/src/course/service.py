import logging
import uuid

from pydantic import UUID4
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.ai.factory import get_ai_provider
from src.ai.subtitles import fetch_subtitles
from src.auth.models import User
from src.config import settings
from src.course.blockchain import get_block_hash_from_tx, verify_payment
from src.course.exceptions import (
    CoursePaybackExceedsPrice,
    PaymentVerificationFailed,
    QuizGenerationFailed,
    TransactionNotFound,
)
from src.course.models import (
    Course,
    CoursePurchase,
    Lesson,
    PaybackTransaction,
    Quiz,
    QuizAnswer,
)
from src.course.schemas import (
    CourseCreate,
    CoursePurchaseCreate,
    CourseProgressResponse,
    CourseResponse,
    CourseUpdate,
    CourseWithLessonsResponse,
    GeneratedQuizList,
    LessonProgressResponse,
    LessonProgressSummary,
    LessonResponse,
    LessonWithQuizzesResponse,
    QuizAnswerCreate,
    QuizResponse,
    QuizResultItem,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------


async def _get_author_wallet_map(
    session: AsyncSession, author_ids: set[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """Return a mapping from author (user) ID to wallet_address."""
    if not author_ids:
        return {}
    result = await session.exec(
        select(User).where(User.id.in_(author_ids))  # type: ignore[union-attr]
    )
    return {u.id: u.wallet_address for u in result.all()}


def _course_to_response(
    course: Course, wallet_map: dict[uuid.UUID, str]
) -> CourseResponse:
    return CourseResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        price=course.price,
        author_id=course.author_id,
        author_wallet_address=wallet_map.get(course.author_id, ""),
        platform_wallet_address=settings.PLATFORM_WALLET_ADDRESS,
        created_at=course.created_at,  # type: ignore[arg-type]
        updated_at=course.updated_at,  # type: ignore[arg-type]
    )


async def get_courses(
    session: AsyncSession, *, offset: int = 0, limit: int = 100
) -> list[CourseResponse]:
    result = await session.exec(select(Course).offset(offset).limit(limit))
    courses = list(result.all())
    wallet_map = await _get_author_wallet_map(session, {c.author_id for c in courses})
    return [_course_to_response(c, wallet_map) for c in courses]


async def get_course_by_id(session: AsyncSession, course_id: UUID4) -> Course | None:
    return await session.get(Course, course_id)


async def get_course_response(session: AsyncSession, course: Course) -> CourseResponse:
    """Build a CourseResponse with the author wallet address."""
    wallet_map = await _get_author_wallet_map(session, {course.author_id})
    return _course_to_response(course, wallet_map)


async def delete_course(session: AsyncSession, course: Course) -> None:
    await session.delete(course)
    await session.commit()


# ---------------------------------------------------------------------------
# Validation: payback + platform fee must not exceed price
# ---------------------------------------------------------------------------


def _validate_course_economics(price: float, lessons: list) -> None:
    """Raise CoursePaybackExceedsPrice if total paybacks + platform fee > price.

    Args:
        price: Course price in token units.
        lessons: List of LessonUpsert (or similar with payback_amount attribute).
    """
    if price <= 0:
        # Free courses: all paybacks must be 0
        total_payback = sum(l.payback_amount for l in lessons)
        if total_payback > 0:
            raise CoursePaybackExceedsPrice("Free courses cannot have payback amounts.")
        return

    total_payback = sum(l.payback_amount for l in lessons)
    platform_fee = price * settings.PLATFORM_FEE_RATE
    if total_payback + platform_fee > price:
        raise CoursePaybackExceedsPrice(
            f"Total payback ({total_payback}) + platform fee ({platform_fee:.4f}) "
            f"= {total_payback + platform_fee:.4f} exceeds course price ({price})."
        )


# ---------------------------------------------------------------------------
# Helper: build CourseWithLessonsResponse from DB objects
# ---------------------------------------------------------------------------
async def _build_course_with_lessons_response(
    session: AsyncSession, course: Course
) -> CourseWithLessonsResponse:
    """Query lessons + quizzes separately and build the nested response."""

    # Query lessons
    lessons_result = await session.exec(
        select(Lesson)
        .where(Lesson.course_id == course.id)  # type: ignore[arg-type]
        .order_by(Lesson.lesson_index)  # type: ignore[arg-type]
    )
    lessons = list(lessons_result.all())

    # Query all quizzes for these lessons in one go
    lesson_ids = [l.id for l in lessons]
    quizzes_by_lesson: dict[uuid.UUID, list[Quiz]] = {}
    if lesson_ids:
        quizzes_result = await session.exec(
            select(Quiz)
            .where(Quiz.lesson_id.in_(lesson_ids))  # type: ignore[union-attr]
            .order_by(Quiz.quiz_index)  # type: ignore[arg-type]
        )
        for q in quizzes_result.all():
            quizzes_by_lesson.setdefault(q.lesson_id, []).append(q)

    # Build nested response
    lesson_responses = [
        LessonWithQuizzesResponse(
            id=l.id,
            title=l.title,
            description=l.description,
            video_url=l.video_url,
            payback_amount=l.payback_amount,
            lesson_index=l.lesson_index,
            course_id=l.course_id,
            created_at=l.created_at,  # type: ignore[arg-type]
            updated_at=l.updated_at,  # type: ignore[arg-type]
            quizzes=[
                QuizResponse.model_validate(q) for q in quizzes_by_lesson.get(l.id, [])
            ],
        )
        for l in lessons
    ]

    wallet_map = await _get_author_wallet_map(session, {course.author_id})

    return CourseWithLessonsResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        price=course.price,
        author_id=course.author_id,
        author_wallet_address=wallet_map.get(course.author_id, ""),
        platform_wallet_address=settings.PLATFORM_WALLET_ADDRESS,
        created_at=course.created_at,  # type: ignore[arg-type]
        updated_at=course.updated_at,  # type: ignore[arg-type]
        lessons=lesson_responses,
    )


# ---------------------------------------------------------------------------
# Helper: sync quizzes for a lesson (desired-state)
# ---------------------------------------------------------------------------
async def _sync_quizzes_for_lesson(
    session: AsyncSession,
    lesson_id: uuid.UUID,
    quiz_upserts: list,
) -> None:
    """Create, update, or delete quizzes for a lesson based on desired state."""

    # Get existing quizzes
    result = await session.exec(
        select(Quiz).where(Quiz.lesson_id == lesson_id)  # type: ignore[arg-type]
    )
    existing_quizzes = {q.id: q for q in result.all()}

    # IDs present in the request
    request_ids: set[uuid.UUID] = set()
    for qd in quiz_upserts:
        if qd.id:
            request_ids.add(qd.id)

    # Delete quizzes not in the request
    for existing_id, existing_quiz in existing_quizzes.items():
        if existing_id not in request_ids:
            await session.delete(existing_quiz)

    # Create or update quizzes
    for qd in quiz_upserts:
        if qd.id and qd.id in existing_quizzes:
            # Update existing quiz
            quiz = existing_quizzes[qd.id]
            quiz.question = qd.question
            quiz.option_a = qd.option_a
            quiz.option_b = qd.option_b
            quiz.option_c = qd.option_c
            quiz.option_d = qd.option_d
            quiz.correct_option = qd.correct_option
            quiz.quiz_index = qd.quiz_index
            quiz.lesson_id = lesson_id
            session.add(quiz)
        else:
            # Create new quiz
            quiz = Quiz(
                id=uuid.uuid4(),
                question=qd.question,
                option_a=qd.option_a,
                option_b=qd.option_b,
                option_c=qd.option_c,
                option_d=qd.option_d,
                correct_option=qd.correct_option,
                quiz_index=qd.quiz_index,
                lesson_id=lesson_id,
            )
            session.add(quiz)


# ---------------------------------------------------------------------------
# Course + Lessons + Quizzes: create (single transaction)
# ---------------------------------------------------------------------------
async def create_course_with_lessons(
    session: AsyncSession, data: CourseCreate, author_id: uuid.UUID
) -> CourseWithLessonsResponse:
    """Create a new course together with all its lessons and quizzes in one transaction.

    The ``author_id`` comes from the authenticated user's JWT (not from the request body).
    Validates that total paybacks + platform fee do not exceed the course price.
    """
    # Validate economics
    _validate_course_economics(data.price, data.lessons)

    course = Course(
        id=uuid.uuid4(),
        title=data.title,
        description=data.description,
        price=data.price,
        author_id=author_id,
    )
    session.add(course)

    # Flush so that course.id is available for FK references
    await session.flush()

    # Create lessons and their quizzes
    for lesson_data in data.lessons:
        lesson = Lesson(
            id=uuid.uuid4(),
            title=lesson_data.title,
            description=lesson_data.description,
            video_url=lesson_data.video_url,
            payback_amount=lesson_data.payback_amount,
            lesson_index=lesson_data.lesson_index,
            course_id=course.id,
        )
        session.add(lesson)
        await session.flush()

        # Create quizzes for this lesson
        for qd in lesson_data.quizzes:
            quiz = Quiz(
                id=uuid.uuid4(),
                question=qd.question,
                option_a=qd.option_a,
                option_b=qd.option_b,
                option_c=qd.option_c,
                option_d=qd.option_d,
                correct_option=qd.correct_option,
                quiz_index=qd.quiz_index,
                lesson_id=lesson.id,
            )
            session.add(quiz)

    await session.commit()
    await session.refresh(course)

    return await _build_course_with_lessons_response(session, course)


# ---------------------------------------------------------------------------
# Course + Lessons + Quizzes: update (single transaction, desired-state sync)
# ---------------------------------------------------------------------------
async def update_course_with_lessons(
    session: AsyncSession, course: Course, data: CourseUpdate
) -> CourseWithLessonsResponse:
    """Update an existing course together with all its lessons and quizzes.

    Lessons and quizzes are synced to desired state: items in the request
    are created or updated, items in DB but not in the request are deleted.
    Validates that total paybacks + platform fee do not exceed the course price.
    """
    # Validate economics
    _validate_course_economics(data.price, data.lessons)

    # --- Update course fields ---
    course.title = data.title
    course.description = data.description
    course.price = data.price
    session.add(course)

    # Flush so that course changes are persisted
    await session.flush()

    # --- Lessons: desired-state sync ---
    result = await session.exec(
        select(Lesson).where(Lesson.course_id == course.id)  # type: ignore[arg-type]
    )
    existing_lessons = {lesson.id: lesson for lesson in result.all()}

    # IDs present in the request (only for lessons that have an id)
    request_ids: set[uuid.UUID] = set()
    for lesson_data in data.lessons:
        if lesson_data.id:
            request_ids.add(lesson_data.id)

    # Delete lessons not in the request (cascade deletes their quizzes)
    for existing_id, existing_lesson in existing_lessons.items():
        if existing_id not in request_ids:
            await session.delete(existing_lesson)

    # Create or update lessons (and sync their quizzes)
    for lesson_data in data.lessons:
        if lesson_data.id and lesson_data.id in existing_lessons:
            # Update existing lesson
            lesson = existing_lessons[lesson_data.id]
            lesson.title = lesson_data.title
            lesson.description = lesson_data.description
            lesson.video_url = lesson_data.video_url
            lesson.payback_amount = lesson_data.payback_amount
            lesson.lesson_index = lesson_data.lesson_index
            lesson.course_id = course.id
            session.add(lesson)
            await session.flush()

            # Sync quizzes for this existing lesson
            await _sync_quizzes_for_lesson(session, lesson.id, lesson_data.quizzes)
        else:
            # Create new lesson
            lesson = Lesson(
                id=uuid.uuid4(),
                title=lesson_data.title,
                description=lesson_data.description,
                video_url=lesson_data.video_url,
                payback_amount=lesson_data.payback_amount,
                lesson_index=lesson_data.lesson_index,
                course_id=course.id,
            )
            session.add(lesson)
            await session.flush()

            # Create quizzes for the new lesson
            for qd in lesson_data.quizzes:
                quiz = Quiz(
                    id=uuid.uuid4(),
                    question=qd.question,
                    option_a=qd.option_a,
                    option_b=qd.option_b,
                    option_c=qd.option_c,
                    option_d=qd.option_d,
                    correct_option=qd.correct_option,
                    quiz_index=qd.quiz_index,
                    lesson_id=lesson.id,
                )
                session.add(quiz)

    await session.commit()
    await session.refresh(course)

    return await _build_course_with_lessons_response(session, course)


# ---------------------------------------------------------------------------
# Lesson (read-only)
# ---------------------------------------------------------------------------
async def get_lessons_by_course(
    session: AsyncSession, course_id: UUID4, *, offset: int = 0, limit: int = 100
) -> list[Lesson]:
    result = await session.exec(
        select(Lesson)
        .where(Lesson.course_id == course_id)  # type: ignore[arg-type]
        .order_by(Lesson.lesson_index)  # type: ignore[arg-type]
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def get_lesson_by_id(session: AsyncSession, lesson_id: UUID4) -> Lesson | None:
    return await session.get(Lesson, lesson_id)


# ---------------------------------------------------------------------------
# Quiz
# ---------------------------------------------------------------------------
async def get_quizzes_by_lesson(
    session: AsyncSession, lesson_id: UUID4, *, offset: int = 0, limit: int = 100
) -> list[Quiz]:
    result = await session.exec(
        select(Quiz)
        .where(Quiz.lesson_id == lesson_id)  # type: ignore[arg-type]
        .order_by(Quiz.quiz_index)  # type: ignore[arg-type]
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def gen_quiz(
    session: AsyncSession, lesson: Lesson, num_questions: int = 3
) -> list[Quiz]:
    """Use AI to generate quiz questions from lesson content.

    1. Optionally fetch YouTube subtitles from the lesson video URL.
    2. Build a system prompt and user prompt with lesson metadata + transcript.
    3. Call the configured AI provider to generate structured quiz data.
    4. Persist each generated quiz to the database.

    Raises:
        QuizGenerationFailed: If the AI provider fails.
    """
    count = max(1, min(num_questions, 10))

    # --- Fetch subtitles (best effort) ---
    subtitle: str | None = None
    if lesson.video_url:
        subtitle = await fetch_subtitles(lesson.video_url)

    # --- Build prompts (mirrors the TypeScript implementation) ---
    system_prompt = (
        "You are an expert educational quiz designer for an online learning platform. "
        "Your task is to create high-quality multiple-choice questions that assess "
        "student comprehension of a lesson.\n\n"
        "Guidelines:\n"
        f"- Generate exactly {count} question{'s' if count > 1 else ''}.\n"
        "- Each question must have exactly 4 options (A, B, C, D) with exactly one correct answer.\n"
        "- Questions should test understanding, not just rote memorization — "
        "include application and analysis-level questions when possible.\n"
        "- Distribute the correct answer across options A–D roughly evenly; "
        "do NOT always make the same option correct.\n"
        "- All incorrect options (distractors) must be plausible — "
        "avoid obviously wrong or joke answers.\n"
        "- Keep question and option text concise but unambiguous.\n"
        "- Cover different parts of the lesson content; avoid asking the same concept twice.\n"
        "- If video subtitles are provided, use them as the primary source of content; "
        "the title and description provide additional context."
    )

    prompt = f"## Lesson Information\n\n**Title:** {lesson.title}\n"
    if lesson.description:
        prompt += f"\n**Description:**\n{lesson.description}\n"
    if subtitle:
        prompt += f"\n**Video Transcript:**\n{subtitle}\n"
    prompt += (
        f"\nGenerate {count} quiz question{'s' if count > 1 else ''} "
        "based on the lesson content above."
    )

    # --- Call AI provider ---
    try:
        provider = get_ai_provider()
        result = await provider.generate_structured(
            system=system_prompt,
            prompt=prompt,
            output_schema=GeneratedQuizList,
        )
    except Exception as exc:
        raise QuizGenerationFailed(detail=str(exc)) from exc

    # --- Persist generated quizzes ---
    # Determine the starting index based on existing quizzes
    existing_quizzes = await get_quizzes_by_lesson(session, lesson.id)
    start_index = max((q.quiz_index for q in existing_quizzes), default=-1) + 1

    quizzes: list[Quiz] = []
    for i, item in enumerate(result.items):
        quiz = Quiz(
            id=uuid.uuid4(),
            question=item.question,
            option_a=item.option_a,
            option_b=item.option_b,
            option_c=item.option_c,
            option_d=item.option_d,
            correct_option=item.correct_option,
            quiz_index=start_index + i,
            lesson_id=lesson.id,
        )
        session.add(quiz)
        quizzes.append(quiz)

    await session.commit()
    for quiz in quizzes:
        await session.refresh(quiz)

    return quizzes


async def gen_quiz_from_data(
    title: str, description: str, video_url: str | None = None, num_questions: int = 3
) -> list[dict]:
    """Generate quiz questions from lesson data without requiring a saved lesson.

    Returns quiz data as dictionaries (not saved to database).

    Args:
        title: Lesson title
        description: Lesson description
        video_url: Optional YouTube video URL
        num_questions: Number of questions to generate (1-10)

    Returns:
        List of quiz dictionaries with question, options, and correct_option

    Raises:
        QuizGenerationFailed: If the AI provider fails.
    """
    count = max(1, min(num_questions, 10))

    # --- Fetch subtitles (best effort) ---
    subtitle: str | None = None
    if video_url:
        subtitle = await fetch_subtitles(video_url)

    # --- Build prompts (same as gen_quiz) ---
    system_prompt = (
        "You are an expert educational quiz designer for an online learning platform. "
        "Your task is to create high-quality multiple-choice questions that assess "
        "student comprehension of a lesson.\n\n"
        "Guidelines:\n"
        f"- Generate exactly {count} question{'s' if count > 1 else ''}.\n"
        "- Each question must have exactly 4 options (A, B, C, D) with exactly one correct answer.\n"
        "- Questions should test understanding, not just rote memorization — "
        "include application and analysis-level questions when possible.\n"
        "- Distribute the correct answer across options A–D roughly evenly; "
        "do NOT always make the same option correct.\n"
        "- All incorrect options (distractors) must be plausible — "
        "avoid obviously wrong or joke answers.\n"
        "- Keep question and option text concise but unambiguous.\n"
        "- Cover different parts of the lesson content; avoid asking the same concept twice.\n"
        "- If video subtitles are provided, use them as the primary source of content; "
        "the title and description provide additional context."
    )

    prompt = f"## Lesson Information\n\n**Title:** {title}\n"
    if description:
        prompt += f"\n**Description:**\n{description}\n"
    if subtitle:
        prompt += f"\n**Video Transcript:**\n{subtitle}\n"
    prompt += (
        f"\nGenerate {count} quiz question{'s' if count > 1 else ''} "
        "based on the lesson content above."
    )

    # --- Call AI provider ---
    try:
        provider = get_ai_provider()
        result = await provider.generate_structured(
            system=system_prompt,
            prompt=prompt,
            output_schema=GeneratedQuizList,
        )
    except Exception as exc:
        raise QuizGenerationFailed(detail=str(exc)) from exc

    # --- Convert to dictionaries without saving ---
    quiz_data = []
    for item in result.items:
        quiz_data.append(
            {
                "question": item.question,
                "option_a": item.option_a,
                "option_b": item.option_b,
                "option_c": item.option_c,
                "option_d": item.option_d,
                "correct_option": item.correct_option,
            }
        )

    return quiz_data


# ---------------------------------------------------------------------------
# QuizAnswer — now includes payback logic
# ---------------------------------------------------------------------------
async def create_quiz_answer(
    session: AsyncSession, data: QuizAnswerCreate, user_id: uuid.UUID
) -> QuizAnswer:
    """Submit a quiz answer.

    ``user_id`` comes from the authenticated user's JWT token.
    """
    answer = QuizAnswer(
        id=uuid.uuid4(),
        quiz_id=data.quiz_id,
        selected_option=data.selected_option,
        user_id=user_id,
    )
    session.add(answer)
    await session.commit()
    await session.refresh(answer)

    # --- Check if this answer triggers a payback ---
    # Uses a *separate* DB session so that any failure (UniqueViolation, etc.)
    # does not poison the caller's session and break response serialisation.
    try:
        await _try_send_payback(data.quiz_id, user_id)
    except Exception:
        logger.exception(
            "Payback attempt failed for user=%s quiz=%s — "
            "the answer was saved but the on-chain transfer did not succeed.",
            user_id,
            data.quiz_id,
        )

    return answer


async def _try_send_payback(quiz_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Check if the user has now passed the lesson and send payback if so.

    Uses its own independent DB session to avoid poisoning the caller's
    session on failure (e.g. UniqueViolation from a race condition).

    Conditions for payback:
    1. The lesson's payback_amount > 0
    2. The user has answered ALL quizzes in the lesson
    3. The user scored >= 70%
    4. No PaybackTransaction exists yet for this (user_id, lesson_id)
    5. The user has purchased the course (not the author)
    """
    from sqlalchemy.exc import IntegrityError

    from src.database import engine

    async with AsyncSession(engine) as pb_session:
        # Get the quiz to find the lesson
        quiz = await pb_session.get(Quiz, quiz_id)
        if not quiz:
            return

        lesson = await pb_session.get(Lesson, quiz.lesson_id)
        if not lesson or lesson.payback_amount <= 0:
            return

        # Check if payback already sent
        existing_payback = await pb_session.exec(
            select(PaybackTransaction).where(
                PaybackTransaction.user_id == user_id,  # type: ignore[arg-type]
                PaybackTransaction.lesson_id == lesson.id,  # type: ignore[arg-type]
            )
        )
        if existing_payback.first():
            return  # Already sent

        # Get all quizzes for this lesson
        quizzes_result = await pb_session.exec(
            select(Quiz).where(Quiz.lesson_id == lesson.id)  # type: ignore[arg-type]
        )
        quizzes = list(quizzes_result.all())
        if not quizzes:
            return

        # Get user's answers for these quizzes
        quiz_ids = [q.id for q in quizzes]
        answers_result = await pb_session.exec(
            select(QuizAnswer).where(
                QuizAnswer.quiz_id.in_(quiz_ids),  # type: ignore[union-attr]
                QuizAnswer.user_id == user_id,  # type: ignore[arg-type]
            )
        )
        answers = list(answers_result.all())

        # Build answer map (last answer per quiz wins)
        answer_map: dict[uuid.UUID, QuizAnswer] = {}
        for a in answers:
            answer_map[a.quiz_id] = a

        # Must have answered all quizzes
        if len(answer_map) < len(quizzes):
            return

        # Calculate score
        correct = sum(
            1
            for q in quizzes
            if q.id in answer_map
            and answer_map[q.id].selected_option == q.correct_option
        )
        score_pct = (correct / len(quizzes)) * 100
        if score_pct < 70.0:
            return  # Not passed

        # Verify the user has purchased the course (not the author)
        course = await pb_session.get(Course, lesson.course_id)
        if not course:
            return
        if course.author_id == user_id:
            return  # Authors don't get paybacks

        purchase_result = await pb_session.exec(
            select(CoursePurchase).where(
                CoursePurchase.course_id == course.id,  # type: ignore[arg-type]
                CoursePurchase.user_id == user_id,  # type: ignore[arg-type]
            )
        )
        if not purchase_result.first():
            return  # No purchase

        # Get user wallet address for on-chain transfer
        user = await pb_session.get(User, user_id)
        if not user:
            return

        # Send payback on-chain
        amount_planck = int(lesson.payback_amount * (10**settings.TOKEN_DECIMALS))
        if amount_planck <= 0:
            return

        logger.info(
            "Attempting payback: %.4f PAS (%d planck) -> %s (user=%s, lesson=%s)",
            lesson.payback_amount,
            amount_planck,
            user.wallet_address,
            user_id,
            lesson.id,
        )

        from src.platform.wallet import async_transfer_payback

        tx_hash = await async_transfer_payback(user.wallet_address, amount_planck)

        # Record the payback transaction
        payback = PaybackTransaction(
            id=uuid.uuid4(),
            user_id=user_id,
            lesson_id=lesson.id,
            course_id=course.id,
            amount=lesson.payback_amount,
            transaction_hash=tx_hash,
        )
        pb_session.add(payback)
        try:
            await pb_session.commit()
        except IntegrityError:
            # Race condition: another request already inserted the payback.
            # The on-chain transfer was already sent (duplicate spend) but
            # we can't undo that.  Log and move on.
            await pb_session.rollback()
            logger.warning(
                "Payback record already exists for user=%s lesson=%s — "
                "on-chain transfer %s may be a duplicate.",
                user_id,
                lesson.id,
                tx_hash,
            )
            return

        logger.info(
            "Payback sent: %.4f PAS -> %s (lesson=%s, tx=%s)",
            lesson.payback_amount,
            user.wallet_address,
            lesson.id,
            tx_hash,
        )


# ---------------------------------------------------------------------------
# CoursePurchase
# ---------------------------------------------------------------------------
async def get_purchases_by_course(
    session: AsyncSession, course_id: UUID4, *, offset: int = 0, limit: int = 100
) -> list[CoursePurchase]:
    result = await session.exec(
        select(CoursePurchase)
        .where(CoursePurchase.course_id == course_id)  # type: ignore[arg-type]
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def get_purchases_by_user(
    session: AsyncSession, user_id: UUID4, *, offset: int = 0, limit: int = 100
) -> list[CoursePurchase]:
    result = await session.exec(
        select(CoursePurchase)
        .where(CoursePurchase.user_id == user_id)  # type: ignore[arg-type]
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def create_purchase(
    session: AsyncSession,
    data: CoursePurchaseCreate,
    course: Course,
    user_id: uuid.UUID,
) -> CoursePurchase:
    """Verify the on-chain payment and persist the purchase with fee split.

    Flow:
    1. Locate the block containing ``data.transaction_hash``.
    2. Verify a ``Balances.Transfer`` to the **platform wallet** for at
       least the course price exists in that block.
    3. Calculate fee split: platform_fee, payback_reserve, teacher_share.
    4. Send teacher's share on-chain from platform wallet.
    5. Persist and return the ``CoursePurchase`` record.

    ``user_id`` comes from the authenticated user's JWT (not from the request body).

    Raises:
        TransactionNotFound: 402 if the tx hash is not in recent blocks.
        PaymentVerificationFailed: 402 if the transfer doesn't match.
    """
    tx_hash = data.transaction_hash

    # Step 1 – find the block that contains this transaction
    block_hash: str | None = data.block_hash
    if block_hash is None:
        block_hash = get_block_hash_from_tx(tx_hash)
    if block_hash is None:
        raise TransactionNotFound(tx_hash)

    # Step 2 – verify payment to PLATFORM wallet (not teacher)
    platform_address = settings.PLATFORM_WALLET_ADDRESS
    if not platform_address:
        raise PaymentVerificationFailed(
            "Platform wallet address not configured. Cannot verify payment."
        )

    min_amount = int(course.price * (10**settings.TOKEN_DECIMALS))

    payment = verify_payment(block_hash, platform_address, min_amount)
    if payment is None:
        raise PaymentVerificationFailed(
            f"No transfer of >= {min_amount} planck to platform wallet {platform_address} "
            f"found in block {block_hash}."
        )

    # Step 3 – calculate fee split
    price = course.price
    platform_fee = round(price * settings.PLATFORM_FEE_RATE, 10)

    # Sum all lesson payback amounts for this course
    lessons_result = await session.exec(
        select(Lesson).where(Lesson.course_id == course.id)  # type: ignore[arg-type]
    )
    lessons = list(lessons_result.all())
    total_payback_reserve = round(sum(l.payback_amount for l in lessons), 10)

    teacher_share = round(price - platform_fee - total_payback_reserve, 10)
    if teacher_share < 0:
        teacher_share = 0.0

    # Step 4 – send teacher's share on-chain (if > 0)
    teacher_payout_hash: str | None = None
    if teacher_share > 0:
        wallet_map = await _get_author_wallet_map(session, {course.author_id})
        teacher_wallet = wallet_map.get(course.author_id)
        if teacher_wallet:
            from src.platform.wallet import async_transfer_to_teacher

            teacher_amount_planck = int(teacher_share * (10**settings.TOKEN_DECIMALS))
            try:
                teacher_payout_hash = await async_transfer_to_teacher(
                    teacher_wallet, teacher_amount_planck
                )
                logger.info(
                    "Teacher payout: %.4f PAS -> %s (tx=%s)",
                    teacher_share,
                    teacher_wallet,
                    teacher_payout_hash,
                )
            except Exception:
                logger.exception(
                    "Teacher payout FAILED: %.4f PAS (%d planck) -> %s for course=%s. "
                    "Purchase will be saved with status='pending'.",
                    teacher_share,
                    teacher_amount_planck,
                    teacher_wallet,
                    course.id,
                )
                # We still record the purchase — teacher payout can be retried
        else:
            logger.warning(
                "No wallet found for author %s; skipping teacher payout.",
                course.author_id,
            )

    # Step 5 – persist
    purchase = CoursePurchase(
        id=uuid.uuid4(),
        course_id=data.course_id,
        user_id=user_id,
        transaction_hash=tx_hash,
        amount=price,
        platform_fee_amount=platform_fee,
        payback_reserve_amount=total_payback_reserve,
        teacher_payout_amount=teacher_share,
        teacher_payout_hash=teacher_payout_hash,
        status="completed" if teacher_payout_hash else "pending",
    )
    session.add(purchase)
    await session.commit()
    await session.refresh(purchase)
    return purchase


# ---------------------------------------------------------------------------
# Progress / Results
# ---------------------------------------------------------------------------


async def get_lesson_progress(
    session: AsyncSession, lesson_id: UUID4, user_id: UUID4
) -> LessonProgressResponse:
    """Get quiz results for a specific lesson for a specific user."""

    # Get all quizzes for the lesson, ordered
    quizzes_result = await session.exec(
        select(Quiz)
        .where(Quiz.lesson_id == lesson_id)  # type: ignore[arg-type]
        .order_by(Quiz.quiz_index)  # type: ignore[arg-type]
    )
    quizzes = list(quizzes_result.all())

    # Check if payback was already sent
    payback_result = await session.exec(
        select(PaybackTransaction).where(
            PaybackTransaction.user_id == user_id,  # type: ignore[arg-type]
            PaybackTransaction.lesson_id == lesson_id,  # type: ignore[arg-type]
        )
    )
    payback = payback_result.first()

    if not quizzes:
        return LessonProgressResponse(
            lesson_id=lesson_id,
            total_questions=0,
            answered=0,
            correct=0,
            score_pct=0.0,
            completed=True,
            passed=True,
            payback_sent=payback is not None,
            payback_tx_hash=payback.transaction_hash if payback else None,
            results=[],
        )

    # Get user's answers for these quizzes
    quiz_ids = [q.id for q in quizzes]
    answers_result = await session.exec(
        select(QuizAnswer).where(
            QuizAnswer.quiz_id.in_(quiz_ids),  # type: ignore[union-attr]
            QuizAnswer.user_id == user_id,  # type: ignore[arg-type]
        )
    )
    answers = list(answers_result.all())

    # Build a map: quiz_id -> latest answer (in case of multiple attempts, take last)
    answer_map: dict[uuid.UUID, QuizAnswer] = {}
    for a in answers:
        answer_map[a.quiz_id] = a  # last wins if duplicates

    # Build results
    results: list[QuizResultItem] = []
    correct_count = 0
    answered_count = 0

    for q in quizzes:
        answer = answer_map.get(q.id)
        is_correct = answer is not None and answer.selected_option == q.correct_option
        if answer is not None:
            answered_count += 1
        if is_correct:
            correct_count += 1
        results.append(
            QuizResultItem(
                quiz_id=q.id,
                question=q.question,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                correct_option=q.correct_option,
                selected_option=answer.selected_option if answer else None,
                is_correct=is_correct,
            )
        )

    total = len(quizzes)
    score_pct = (correct_count / total * 100) if total > 0 else 0.0

    return LessonProgressResponse(
        lesson_id=lesson_id,
        total_questions=total,
        answered=answered_count,
        correct=correct_count,
        score_pct=round(score_pct, 1),
        completed=answered_count >= total,
        passed=score_pct >= 70.0,
        payback_sent=payback is not None,
        payback_tx_hash=payback.transaction_hash if payback else None,
        results=results,
    )


async def get_course_progress(
    session: AsyncSession, course_id: UUID4, user_id: UUID4
) -> CourseProgressResponse:
    """Get overall progress for a course for a specific user."""

    # Get all lessons for the course
    lessons_result = await session.exec(
        select(Lesson)
        .where(Lesson.course_id == course_id)  # type: ignore[arg-type]
        .order_by(Lesson.lesson_index)  # type: ignore[arg-type]
    )
    lessons = list(lessons_result.all())

    if not lessons:
        return CourseProgressResponse(
            course_id=course_id,
            total_lessons=0,
            completed_lessons=0,
            passed_lessons=0,
            total_earned=0.0,
            lessons=[],
        )

    # Get all quiz IDs for all lessons
    lesson_ids = [l.id for l in lessons]
    all_quizzes_result = await session.exec(
        select(Quiz).where(Quiz.lesson_id.in_(lesson_ids))  # type: ignore[union-attr]
    )
    all_quizzes = list(all_quizzes_result.all())

    # Group quizzes by lesson_id
    quizzes_by_lesson: dict[uuid.UUID, list[Quiz]] = {}
    for q in all_quizzes:
        quizzes_by_lesson.setdefault(q.lesson_id, []).append(q)

    # Get all user answers for these quizzes
    all_quiz_ids = [q.id for q in all_quizzes]
    answer_map: dict[uuid.UUID, QuizAnswer] = {}
    if all_quiz_ids:
        answers_result = await session.exec(
            select(QuizAnswer).where(
                QuizAnswer.quiz_id.in_(all_quiz_ids),  # type: ignore[union-attr]
                QuizAnswer.user_id == user_id,  # type: ignore[arg-type]
            )
        )
        for a in answers_result.all():
            answer_map[a.quiz_id] = a

    # Get all payback transactions for this user and these lessons
    payback_map: dict[uuid.UUID, PaybackTransaction] = {}
    paybacks_result = await session.exec(
        select(PaybackTransaction).where(
            PaybackTransaction.user_id == user_id,  # type: ignore[arg-type]
            PaybackTransaction.lesson_id.in_(lesson_ids),  # type: ignore[union-attr]
        )
    )
    for pb in paybacks_result.all():
        payback_map[pb.lesson_id] = pb

    # Build per-lesson summaries
    lesson_summaries: list[LessonProgressSummary] = []
    completed_lessons = 0
    passed_lessons = 0
    total_earned = 0.0

    for lesson in lessons:
        lesson_quizzes = quizzes_by_lesson.get(lesson.id, [])
        total_q = len(lesson_quizzes)
        answered = 0
        correct = 0

        for q in lesson_quizzes:
            ans = answer_map.get(q.id)
            if ans is not None:
                answered += 1
                if ans.selected_option == q.correct_option:
                    correct += 1

        score_pct = (correct / total_q * 100) if total_q > 0 else 0.0
        is_completed = answered >= total_q if total_q > 0 else False
        is_passed = score_pct >= 70.0 and is_completed

        if is_completed:
            completed_lessons += 1
        if is_passed:
            passed_lessons += 1

        # Only count earned if payback was actually sent on-chain
        payback_sent = lesson.id in payback_map
        if payback_sent:
            total_earned += payback_map[lesson.id].amount

        lesson_summaries.append(
            LessonProgressSummary(
                lesson_id=lesson.id,
                lesson_title=lesson.title,
                lesson_index=lesson.lesson_index,
                payback_amount=lesson.payback_amount,
                total_questions=total_q,
                answered=answered,
                correct=correct,
                score_pct=round(score_pct, 1),
                completed=is_completed,
                passed=is_passed,
                payback_sent=payback_sent,
            )
        )

    return CourseProgressResponse(
        course_id=course_id,
        total_lessons=len(lessons),
        completed_lessons=completed_lessons,
        passed_lessons=passed_lessons,
        total_earned=round(total_earned, 4),
        lessons=lesson_summaries,
    )
