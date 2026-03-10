import uuid

from fastapi import HTTPException, status


class CourseNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found.",
        )


class LessonNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found.",
        )


class QuizNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found.",
        )


class QuizAnswerNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz answer not found.",
        )


class CoursePurchaseNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course purchase not found.",
        )


class TransactionNotFound(HTTPException):
    """Transaction hash was not found in recent finalized blocks."""

    def __init__(self, transaction_hash: str) -> None:
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Transaction {transaction_hash} not found in recent finalized blocks. "
                "It may not be finalized yet — please wait and retry."
            ),
        )


class PaymentVerificationFailed(HTTPException):
    """Transfer exists but does not match expected recipient/amount."""

    def __init__(self, detail: str = "Payment verification failed.") -> None:
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=detail,
        )


class PaymentRequired(HTTPException):
    """Access denied — course has not been purchased.

    Returns a structured 402 response that the x402 agent can parse to
    initiate the payment flow automatically.
    """

    def __init__(
        self,
        course_id: uuid.UUID,
        course_title: str,
        price: float,
        platform_wallet_address: str,
    ) -> None:
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "type": "payment_required",
                "message": "You must purchase this course to access its content.",
                "course_id": str(course_id),
                "course_title": course_title,
                "price": price,
                "platform_wallet_address": platform_wallet_address,
            },
        )


class CoursePaybackExceedsPrice(HTTPException):
    """Total payback + platform fee exceeds the course price."""

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
            or "Total lesson paybacks plus platform fee exceed the course price.",
        )


class QuizGenerationFailed(HTTPException):
    """AI quiz generation failed."""

    def __init__(self, detail: str = "Quiz generation failed.") -> None:
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        )
