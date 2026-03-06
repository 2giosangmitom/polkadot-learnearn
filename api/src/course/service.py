import uuid

from pydantic import UUID4
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.ai.factory import get_ai_provider
from src.ai.subtitles import fetch_subtitles
from src.config import settings
from src.course.blockchain import get_block_hash_from_tx, verify_payment
from src.course.exceptions import (
    PaymentVerificationFailed,
    QuizGenerationFailed,
    TransactionNotFound,
)
from src.course.models import Course, CoursePurchase, Lesson, Quiz, QuizAnswer
from src.course.schemas import (
    CourseCreate,
    CoursePurchaseCreate,
    CourseUpdate,
    GeneratedQuizList,
    LessonCreate,
    LessonUpdate,
    QuizAnswerCreate,
    QuizCreate,
    QuizUpdate,
)


# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------
async def get_courses(
    session: AsyncSession, *, offset: int = 0, limit: int = 100
) -> list[Course]:
    result = await session.exec(select(Course).offset(offset).limit(limit))
    return list(result.all())


async def get_course_by_id(session: AsyncSession, course_id: UUID4) -> Course | None:
    return await session.get(Course, course_id)


async def create_course(session: AsyncSession, data: CourseCreate) -> Course:
    course = Course(
        id=uuid.uuid4(),
        title=data.title,
        description=data.description,
        price=data.price,
        author_id=data.author_id,
    )
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return course


async def update_course(
    session: AsyncSession, course: Course, data: CourseUpdate
) -> Course:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(course, key, value)
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return course


async def delete_course(session: AsyncSession, course: Course) -> None:
    await session.delete(course)
    await session.commit()


# ---------------------------------------------------------------------------
# Lesson
# ---------------------------------------------------------------------------
async def get_lessons_by_course(
    session: AsyncSession, course_id: UUID4, *, offset: int = 0, limit: int = 100
) -> list[Lesson]:
    result = await session.exec(
        select(Lesson)
        .where(Lesson.course_id == course_id)  # type: ignore[arg-type]
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def get_lesson_by_id(session: AsyncSession, lesson_id: UUID4) -> Lesson | None:
    return await session.get(Lesson, lesson_id)


async def create_lesson(
    session: AsyncSession, course_id: UUID4, data: LessonCreate
) -> Lesson:
    lesson = Lesson(
        id=uuid.uuid4(),
        title=data.title,
        description=data.description,
        video_url=data.video_url,
        payback_amount=data.payback_amount,
        course_id=course_id,
    )
    session.add(lesson)
    await session.commit()
    await session.refresh(lesson)
    return lesson


async def update_lesson(
    session: AsyncSession, lesson: Lesson, data: LessonUpdate
) -> Lesson:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, key, value)
    session.add(lesson)
    await session.commit()
    await session.refresh(lesson)
    return lesson


async def delete_lesson(session: AsyncSession, lesson: Lesson) -> None:
    await session.delete(lesson)
    await session.commit()


# ---------------------------------------------------------------------------
# Quiz
# ---------------------------------------------------------------------------
async def get_quizzes_by_lesson(
    session: AsyncSession, lesson_id: UUID4, *, offset: int = 0, limit: int = 100
) -> list[Quiz]:
    result = await session.exec(
        select(Quiz)
        .where(Quiz.lesson_id == lesson_id)  # type: ignore[arg-type]
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def get_quiz_by_id(session: AsyncSession, quiz_id: UUID4) -> Quiz | None:
    return await session.get(Quiz, quiz_id)


async def create_quiz(
    session: AsyncSession, lesson_id: UUID4, data: QuizCreate
) -> Quiz:
    quiz = Quiz(
        id=uuid.uuid4(),
        question=data.question,
        option_a=data.option_a,
        option_b=data.option_b,
        option_c=data.option_c,
        option_d=data.option_d,
        correct_option=data.correct_option,
        lesson_id=lesson_id,
    )
    session.add(quiz)
    await session.commit()
    await session.refresh(quiz)
    return quiz


async def update_quiz(session: AsyncSession, quiz: Quiz, data: QuizUpdate) -> Quiz:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(quiz, key, value)
    session.add(quiz)
    await session.commit()
    await session.refresh(quiz)
    return quiz


async def delete_quiz(session: AsyncSession, quiz: Quiz) -> None:
    await session.delete(quiz)
    await session.commit()


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
    quizzes: list[Quiz] = []
    for item in result.items:
        quiz = Quiz(
            id=uuid.uuid4(),
            question=item.question,
            option_a=item.option_a,
            option_b=item.option_b,
            option_c=item.option_c,
            option_d=item.option_d,
            correct_option=item.correct_option,
            lesson_id=lesson.id,
        )
        session.add(quiz)
        quizzes.append(quiz)

    await session.commit()
    for quiz in quizzes:
        await session.refresh(quiz)

    return quizzes


# ---------------------------------------------------------------------------
# QuizAnswer
# ---------------------------------------------------------------------------
async def get_quiz_answers_by_quiz(
    session: AsyncSession, quiz_id: UUID4, *, offset: int = 0, limit: int = 100
) -> list[QuizAnswer]:
    result = await session.exec(
        select(QuizAnswer)
        .where(QuizAnswer.quiz_id == quiz_id)  # type: ignore[arg-type]
        .offset(offset)
        .limit(limit)
    )
    return list(result.all())


async def get_quiz_answer_by_id(
    session: AsyncSession, answer_id: UUID4
) -> QuizAnswer | None:
    return await session.get(QuizAnswer, answer_id)


async def create_quiz_answer(
    session: AsyncSession, data: QuizAnswerCreate
) -> QuizAnswer:
    answer = QuizAnswer(
        id=uuid.uuid4(),
        quiz_id=data.quiz_id,
        selected_option=data.selected_option,
        user_id=data.user_id,
    )
    session.add(answer)
    await session.commit()
    await session.refresh(answer)
    return answer


async def delete_quiz_answer(session: AsyncSession, answer: QuizAnswer) -> None:
    await session.delete(answer)
    await session.commit()


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


async def get_purchase_by_id(
    session: AsyncSession, purchase_id: UUID4
) -> CoursePurchase | None:
    return await session.get(CoursePurchase, purchase_id)


async def create_purchase(
    session: AsyncSession, data: CoursePurchaseCreate, course: Course
) -> CoursePurchase:
    """Verify the on-chain payment and persist the purchase.

    1. Locate the block containing ``data.transaction_hash``.
    2. Verify a ``Balances.Transfer`` to the platform recipient for at least
       the course price exists in that block.
    3. Persist and return the ``CoursePurchase`` record.

    Raises:
        TransactionNotFound: 402 if the tx hash is not in recent blocks.
        PaymentVerificationFailed: 402 if the transfer doesn't match.
    """
    tx_hash = data.transaction_hash

    # Step 1 – find the block that contains this transaction
    block_hash = get_block_hash_from_tx(tx_hash)
    if block_hash is None:
        raise TransactionNotFound(tx_hash)

    # Step 2 – verify the transfer event inside that block
    # Convert course price (float, token units) to planck (int).
    # Paseo uses 10 decimals, so 1 PAS = 10_000_000_000 planck.
    min_amount = int(course.price * 10_000_000_000)
    recipient = settings.DEFAULT_RECIPIENT_WALLET

    payment = verify_payment(block_hash, recipient, min_amount)
    if payment is None:
        raise PaymentVerificationFailed(
            f"No transfer of >= {min_amount} planck to {recipient} "
            f"found in block {block_hash}."
        )

    # Step 3 – persist
    purchase = CoursePurchase(
        id=uuid.uuid4(),
        course_id=data.course_id,
        user_id=data.user_id,
        transaction_hash=tx_hash,
    )
    session.add(purchase)
    await session.commit()
    await session.refresh(purchase)
    return purchase


async def delete_purchase(session: AsyncSession, purchase: CoursePurchase) -> None:
    await session.delete(purchase)
    await session.commit()
