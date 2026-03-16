import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Course (read-only responses)
# ---------------------------------------------------------------------------
class CourseResponse(BaseModel):
    """Schema returned when reading a course."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique course identifier.")
    title: str = Field(description="Course title.")
    description: str = Field(description="Course description.")
    price: float = Field(description="Course price.")
    author_id: uuid.UUID = Field(description="Author (teacher) ID.")
    author_wallet_address: str = Field(
        description="Wallet address of the author (teacher).",
    )
    platform_wallet_address: str = Field(
        description="Platform wallet address where students send payment.",
    )
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")


# ---------------------------------------------------------------------------
# Activities / Transactions
# ---------------------------------------------------------------------------
class ActivityType(str, enum.Enum):
    PURCHASE = "purchase"
    PAYBACK = "payback"
    TEACHER_PAYOUT = "teacher_payout"


class ActivityItem(BaseModel):
    """A single activity item (transaction) for a course."""

    id: uuid.UUID = Field(description="Unique identifier for the activity.")
    type: ActivityType = Field(description="Type of activity.")
    amount: float = Field(description="Amount in token units.")
    transaction_hash: str = Field(description="On-chain transaction hash.")
    timestamp: datetime = Field(description="Time of the activity.")
    status: str = Field(default="completed", description="Status of the transaction.")
    description: str = Field(description="Description of the activity.")
    user_id: uuid.UUID = Field(description="User involved in the activity.")
    subscan_link: str | None = Field(
        default=None, description="Link to Subscan for this transaction."
    )


class ActivityListResponse(BaseModel):
    """List of activities for a course."""

    course_id: uuid.UUID = Field(description="Course ID.")
    activities: list[ActivityItem] = Field(description="List of activities.")


# ---------------------------------------------------------------------------
# Lesson (read-only responses)
# ---------------------------------------------------------------------------
class LessonResponse(BaseModel):
    """Schema returned when reading a lesson."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique lesson identifier.")
    title: str = Field(description="Lesson title.")
    description: str = Field(description="Lesson description.")
    video_url: str = Field(description="Video URL.")
    payback_amount: float = Field(description="Payback amount.")
    lesson_index: int = Field(description="Ordering index within the course.")
    course_id: uuid.UUID = Field(description="Parent course ID.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")


# ---------------------------------------------------------------------------
# Upsert: Course + Lessons in one request
# ---------------------------------------------------------------------------
class QuizUpsert(BaseModel):
    """A single quiz question inside a lesson upsert request.

    If ``id`` is provided, the existing quiz is updated.
    If ``id`` is ``None``, a new quiz is created.
    Quizzes present in the DB but *not* included in the request are deleted.
    """

    id: uuid.UUID | None = Field(
        default=None,
        description="Existing quiz ID (omit or null to create a new quiz).",
    )
    question: str = Field(..., min_length=1, description="Quiz question text.")
    option_a: str = Field(..., min_length=1, description="Option A.")
    option_b: str = Field(..., min_length=1, description="Option B.")
    option_c: str = Field(..., min_length=1, description="Option C.")
    option_d: str = Field(..., min_length=1, description="Option D.")
    correct_option: int = Field(
        ..., ge=1, le=4, description="Correct option number (1=A, 2=B, 3=C, 4=D)."
    )
    quiz_index: int = Field(..., ge=0, description="Ordering index within the lesson.")


class LessonUpsert(BaseModel):
    """A single lesson inside a course create/update request.

    If ``id`` is provided, the existing lesson is updated.
    If ``id`` is ``None``, a new lesson is created.
    Lessons present in the DB but *not* included in the request are deleted.
    """

    id: uuid.UUID | None = Field(
        default=None,
        description="Existing lesson ID (omit or null to create a new lesson).",
    )
    title: str = Field(..., min_length=1, description="Lesson title.")
    description: str = Field(..., min_length=1, description="Lesson description.")
    video_url: str = Field(..., min_length=1, description="URL of the lesson video.")
    payback_amount: float = Field(
        ..., ge=0, description="Token amount paid back to the student upon completion."
    )
    lesson_index: int = Field(
        ..., ge=0, description="Ordering index within the course."
    )
    quizzes: list[QuizUpsert] = Field(
        default_factory=list,
        description="Full list of quiz questions for this lesson.",
    )


class CourseCreate(BaseModel):
    """Create a new course together with all its lessons.

    ``author_id`` is no longer in the request body — it is inferred from
    the authenticated user's JWT token.
    """

    title: str = Field(..., min_length=1, description="Course title.")
    description: str = Field(..., min_length=1, description="Course description.")
    price: float = Field(..., ge=0, description="Course price in token units.")
    lessons: list[LessonUpsert] = Field(
        default_factory=list,
        description="Full list of lessons for the course.",
    )


class CourseUpdate(BaseModel):
    """Update an existing course together with all its lessons.

    The ``lessons`` array represents the *desired* state — any existing lessons
    not present in the array will be deleted.
    """

    title: str = Field(..., min_length=1, description="Course title.")
    description: str = Field(..., min_length=1, description="Course description.")
    price: float = Field(..., ge=0, description="Course price in token units.")
    lessons: list[LessonUpsert] = Field(
        default_factory=list,
        description="Full list of lessons for the course (desired state).",
    )


# ---------------------------------------------------------------------------
# Quiz
# ---------------------------------------------------------------------------
class QuizResponse(BaseModel):
    """Schema returned when reading a quiz question."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique quiz identifier.")
    question: str = Field(description="Quiz question text.")
    option_a: str = Field(description="Option A.")
    option_b: str = Field(description="Option B.")
    option_c: str = Field(description="Option C.")
    option_d: str = Field(description="Option D.")
    correct_option: int = Field(description="Correct option number (1-4).")
    quiz_index: int = Field(description="Ordering index within the lesson.")
    lesson_id: uuid.UUID = Field(description="Parent lesson ID.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")


# ---------------------------------------------------------------------------
# Nested responses (Course + Lessons + Quizzes)
# ---------------------------------------------------------------------------
class LessonWithQuizzesResponse(BaseModel):
    """Lesson with its nested quizzes returned after an upsert."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique lesson identifier.")
    title: str = Field(description="Lesson title.")
    description: str = Field(description="Lesson description.")
    video_url: str = Field(description="Video URL.")
    payback_amount: float = Field(description="Payback amount.")
    lesson_index: int = Field(description="Ordering index within the course.")
    course_id: uuid.UUID = Field(description="Parent course ID.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")
    quizzes: list[QuizResponse] = Field(
        default_factory=list,
        description="Quiz questions belonging to this lesson.",
    )


class CourseWithLessonsResponse(BaseModel):
    """Course with its nested lessons (and their quizzes) returned after an upsert."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique course identifier.")
    title: str = Field(description="Course title.")
    description: str = Field(description="Course description.")
    price: float = Field(description="Course price.")
    author_id: uuid.UUID = Field(description="Author (teacher) ID.")
    author_wallet_address: str = Field(
        description="Wallet address of the author (teacher).",
    )
    platform_wallet_address: str = Field(
        description="Platform wallet address where students send payment.",
    )
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")
    lessons: list[LessonWithQuizzesResponse] = Field(
        description="Lessons (with quizzes) belonging to this course."
    )


class GenerateQuizRequest(BaseModel):
    """Schema for requesting AI-generated quiz questions for a lesson."""

    num_questions: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of quiz questions to generate (1-10).",
    )


class GenerateQuizFromDataRequest(BaseModel):
    """Schema for generating quiz questions from lesson data without requiring a saved lesson."""

    title: str = Field(description="Lesson title.")
    description: str = Field(description="Lesson description.")
    video_url: str | None = Field(
        default=None, description="YouTube video URL (optional)."
    )
    num_questions: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of quiz questions to generate (1-10).",
    )


class GeneratedQuizItem(BaseModel):
    """Schema describing a single AI-generated quiz question.

    Used as the output schema for the AI provider so the model returns
    structured JSON that can be directly validated.
    """

    question: str = Field(description="The quiz question text.")
    option_a: str = Field(description="Answer option A.")
    option_b: str = Field(description="Answer option B.")
    option_c: str = Field(description="Answer option C.")
    option_d: str = Field(description="Answer option D.")
    correct_option: int = Field(
        ge=1, le=4, description="Correct option number (1=A, 2=B, 3=C, 4=D)."
    )


class GeneratedQuizList(BaseModel):
    """Wrapper list returned by the AI provider."""

    items: list[GeneratedQuizItem] = Field(
        description="List of generated quiz questions."
    )


# ---------------------------------------------------------------------------
# QuizAnswer
# ---------------------------------------------------------------------------
class QuizAnswerCreate(BaseModel):
    """Schema for submitting an answer to a quiz question.

    ``user_id`` is no longer in the request body — it is inferred from
    the authenticated user's JWT token.
    """

    quiz_id: uuid.UUID = Field(..., description="ID of the quiz being answered.")
    selected_option: int = Field(
        ..., ge=1, le=4, description="Selected option number (1=A, 2=B, 3=C, 4=D)."
    )


class QuizAnswerResponse(BaseModel):
    """Schema returned when reading a quiz answer."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique quiz answer identifier.")
    quiz_id: uuid.UUID = Field(description="Quiz ID.")
    selected_option: int = Field(description="Selected option number.")
    user_id: uuid.UUID = Field(description="Answering user ID.")


# ---------------------------------------------------------------------------
# CoursePurchase
# ---------------------------------------------------------------------------
class CoursePurchaseCreate(BaseModel):
    """Schema for recording a course purchase.

    The ``transaction_hash`` is verified on-chain via the Polkadot light
    client before the purchase is persisted.  If the transaction cannot
    be found or the payment does not match the course price, a
    **402 Payment Required** error is returned.

    ``user_id`` is no longer in the request body — it is inferred from
    the authenticated user's JWT token.

    When ``block_hash`` is provided the server can skip the expensive
    backwards block search and verify the transaction directly in that
    block.  The frontend should always try to include ``block_hash``
    from the transaction receipt.
    """

    course_id: uuid.UUID = Field(..., description="ID of the purchased course.")
    transaction_hash: str = Field(
        ...,
        min_length=2,
        description="0x-prefixed hex transaction hash from the Polkadot network.",
    )
    block_hash: str | None = Field(
        default=None,
        description=(
            "0x-prefixed hex block hash where the transaction was included. "
            "When provided the server verifies directly in this block, "
            "avoiding the finalized-block search."
        ),
    )


class CoursePurchaseResponse(BaseModel):
    """Schema returned when reading a course purchase."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique purchase identifier.")
    course_id: uuid.UUID = Field(description="Purchased course ID.")
    user_id: uuid.UUID = Field(description="Purchasing user ID.")
    transaction_hash: str = Field(description="On-chain transaction hash (hex).")
    amount: float = Field(description="Payment amount in token units.")
    platform_fee_amount: float = Field(description="Platform fee in token units.")
    payback_reserve_amount: float = Field(
        description="Total payback reserve in token units."
    )
    teacher_payout_amount: float = Field(description="Teacher payout in token units.")
    teacher_payout_hash: str | None = Field(
        description="On-chain hash of the teacher payout transfer."
    )
    status: str = Field(description="Purchase status (pending/completed/failed).")
    created_at: datetime | None = Field(description="Creation timestamp.")
    updated_at: datetime | None = Field(description="Last update timestamp.")


# ---------------------------------------------------------------------------
# PaybackTransaction
# ---------------------------------------------------------------------------
class PaybackTransactionResponse(BaseModel):
    """Schema returned when a payback has been sent to a student."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique payback transaction identifier.")
    user_id: uuid.UUID = Field(description="Student user ID.")
    lesson_id: uuid.UUID = Field(description="Lesson ID.")
    course_id: uuid.UUID = Field(description="Course ID.")
    amount: float = Field(description="Payback amount in token units.")
    transaction_hash: str = Field(
        description="On-chain transaction hash of the payback transfer."
    )
    created_at: datetime | None = Field(description="Creation timestamp.")


# ---------------------------------------------------------------------------
# Progress / Results
# ---------------------------------------------------------------------------
class QuizResultItem(BaseModel):
    """A single quiz question with the user's answer and correctness."""

    quiz_id: uuid.UUID = Field(description="Quiz ID.")
    question: str = Field(description="Quiz question text.")
    option_a: str = Field(description="Option A.")
    option_b: str = Field(description="Option B.")
    option_c: str = Field(description="Option C.")
    option_d: str = Field(description="Option D.")
    correct_option: int = Field(description="Correct option number (1-4).")
    selected_option: int | None = Field(
        description="The user's selected option (null if not answered)."
    )
    is_correct: bool = Field(description="Whether the user's answer was correct.")


class LessonProgressResponse(BaseModel):
    """Quiz results for a specific lesson for a specific user."""

    lesson_id: uuid.UUID = Field(description="Lesson ID.")
    total_questions: int = Field(description="Total quiz questions in the lesson.")
    answered: int = Field(description="Number of questions answered by the user.")
    correct: int = Field(description="Number of correct answers.")
    score_pct: float = Field(
        description="Score as a percentage (0-100). 0 if no questions."
    )
    completed: bool = Field(description="Whether the user has answered all questions.")
    passed: bool = Field(description="Whether the user scored >= 70%.")
    payback_sent: bool = Field(
        default=False,
        description="Whether the payback has already been sent for this lesson.",
    )
    payback_tx_hash: str | None = Field(
        default=None,
        description="On-chain hash of the payback transaction (if sent).",
    )
    results: list[QuizResultItem] = Field(description="Per-question results.")


class CourseProgressResponse(BaseModel):
    """Overall progress for a course for a specific user."""

    course_id: uuid.UUID = Field(description="Course ID.")
    total_lessons: int = Field(description="Total lessons in the course.")
    completed_lessons: int = Field(
        description="Number of lessons where all quizzes are answered."
    )
    passed_lessons: int = Field(description="Number of lessons where score >= 70%.")
    total_earned: float = Field(description="Total PAS earned from passing lessons.")
    lessons: list["LessonProgressSummary"] = Field(
        description="Per-lesson progress summaries."
    )


class LessonProgressSummary(BaseModel):
    """Summary of progress for a single lesson within a course."""

    lesson_id: uuid.UUID = Field(description="Lesson ID.")
    lesson_title: str = Field(description="Lesson title.")
    lesson_index: int = Field(description="Lesson ordering index.")
    payback_amount: float = Field(description="PAS reward for this lesson.")
    total_questions: int = Field(description="Total quiz questions.")
    answered: int = Field(description="Number answered.")
    correct: int = Field(description="Number correct.")
    score_pct: float = Field(description="Score percentage (0-100).")
    completed: bool = Field(description="All questions answered.")
    passed: bool = Field(description="Score >= 70%.")
    payback_sent: bool = Field(
        default=False,
        description="Whether the payback has been sent for this lesson.",
    )


# ---------------------------------------------------------------------------
# YouTube Metadata
# ---------------------------------------------------------------------------
class YouTubeMetadataResponse(BaseModel):
    """YouTube video metadata response."""

    title: str = Field(description="Video title.")
    description: str = Field(description="Video description.")
    duration: int | None = Field(description="Video duration in seconds.")
    uploader: str | None = Field(description="Channel name.")
    upload_date: str | None = Field(description="Upload date.")
    success: bool = Field(description="Whether metadata extraction was successful.")
