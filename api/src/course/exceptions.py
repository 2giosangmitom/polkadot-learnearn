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


class QuizGenerationFailed(HTTPException):
    """AI quiz generation failed."""

    def __init__(self, detail: str = "Quiz generation failed.") -> None:
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        )
