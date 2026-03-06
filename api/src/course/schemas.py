import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------
class CourseCreate(BaseModel):
    """Schema for creating a new course."""

    title: str = Field(..., min_length=1, description="Course title.")
    description: str = Field(..., min_length=1, description="Course description.")
    price: float = Field(..., ge=0, description="Course price in token units.")
    author_id: uuid.UUID = Field(
        ..., description="UUID of the teacher who authored the course."
    )


class CourseUpdate(BaseModel):
    """Schema for partially updating a course."""

    title: str | None = Field(default=None, min_length=1, description="New title.")
    description: str | None = Field(
        default=None, min_length=1, description="New description."
    )
    price: float | None = Field(default=None, ge=0, description="New price.")


class CourseResponse(BaseModel):
    """Schema returned when reading a course."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique course identifier.")
    title: str = Field(description="Course title.")
    description: str = Field(description="Course description.")
    price: float = Field(description="Course price.")
    author_id: uuid.UUID = Field(description="Author (teacher) ID.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")


# ---------------------------------------------------------------------------
# Lesson
# ---------------------------------------------------------------------------
class LessonCreate(BaseModel):
    """Schema for creating a new lesson within a course."""

    title: str = Field(..., min_length=1, description="Lesson title.")
    description: str = Field(..., min_length=1, description="Lesson description.")
    video_url: str = Field(..., min_length=1, description="URL of the lesson video.")
    payback_amount: float = Field(
        ..., ge=0, description="Token amount paid back to the student upon completion."
    )


class LessonUpdate(BaseModel):
    """Schema for partially updating a lesson."""

    title: str | None = Field(default=None, min_length=1, description="New title.")
    description: str | None = Field(
        default=None, min_length=1, description="New description."
    )
    video_url: str | None = Field(
        default=None, min_length=1, description="New video URL."
    )
    payback_amount: float | None = Field(
        default=None, ge=0, description="New payback amount."
    )


class LessonResponse(BaseModel):
    """Schema returned when reading a lesson."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique lesson identifier.")
    title: str = Field(description="Lesson title.")
    description: str = Field(description="Lesson description.")
    video_url: str = Field(description="Video URL.")
    payback_amount: float = Field(description="Payback amount.")
    course_id: uuid.UUID = Field(description="Parent course ID.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")


# ---------------------------------------------------------------------------
# Quiz
# ---------------------------------------------------------------------------
class QuizCreate(BaseModel):
    """Schema for creating a new quiz question within a lesson."""

    question: str = Field(..., min_length=1, description="The quiz question text.")
    option_a: str = Field(..., min_length=1, description="Answer option A.")
    option_b: str = Field(..., min_length=1, description="Answer option B.")
    option_c: str = Field(..., min_length=1, description="Answer option C.")
    option_d: str = Field(..., min_length=1, description="Answer option D.")
    correct_option: int = Field(
        ..., ge=1, le=4, description="Correct option number (1=A, 2=B, 3=C, 4=D)."
    )


class QuizUpdate(BaseModel):
    """Schema for partially updating a quiz question."""

    question: str | None = Field(
        default=None, min_length=1, description="New question text."
    )
    option_a: str | None = Field(
        default=None, min_length=1, description="New option A."
    )
    option_b: str | None = Field(
        default=None, min_length=1, description="New option B."
    )
    option_c: str | None = Field(
        default=None, min_length=1, description="New option C."
    )
    option_d: str | None = Field(
        default=None, min_length=1, description="New option D."
    )
    correct_option: int | None = Field(
        default=None, ge=1, le=4, description="New correct option number."
    )


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
    lesson_id: uuid.UUID = Field(description="Parent lesson ID.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")


class GenerateQuizRequest(BaseModel):
    """Schema for requesting AI-generated quiz questions for a lesson."""

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
    """Schema for submitting an answer to a quiz question."""

    quiz_id: uuid.UUID = Field(..., description="ID of the quiz being answered.")
    selected_option: int = Field(
        ..., ge=1, le=4, description="Selected option number (1=A, 2=B, 3=C, 4=D)."
    )
    user_id: uuid.UUID = Field(..., description="ID of the user submitting the answer.")


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
    """

    course_id: uuid.UUID = Field(..., description="ID of the purchased course.")
    user_id: uuid.UUID = Field(..., description="ID of the purchasing user.")
    transaction_hash: str = Field(
        ...,
        min_length=2,
        description="0x-prefixed hex transaction hash from the Polkadot network.",
    )


class CoursePurchaseResponse(BaseModel):
    """Schema returned when reading a course purchase."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique purchase identifier.")
    course_id: uuid.UUID = Field(description="Purchased course ID.")
    user_id: uuid.UUID = Field(description="Purchasing user ID.")
    transaction_hash: str = Field(description="On-chain transaction hash (hex).")
