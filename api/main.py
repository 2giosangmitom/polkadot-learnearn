from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import SQLModel

# Import database first to set naming conventions before models register
from src.database import engine  # noqa: F401

# Import all models so SQLModel metadata is fully populated
from src.auth.models import User  # noqa: F401
from src.course.models import (  # noqa: F401
    Course,
    CoursePurchase,
    Lesson,
    Quiz,
    QuizAnswer,
)

from src.auth.router import router as auth_router
from src.course.router import (
    course_router,
    lesson_detail_router,
    lesson_router,
    purchase_router,
    quiz_answer_detail_router,
    quiz_answer_router,
    quiz_detail_router,
    quiz_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


app = FastAPI(
    title="Polkadot LearnEarn API",
    description=(
        "Backend API for the Polkadot LearnEarn platform. "
        "Teachers create courses with lessons and quizzes; "
        "students purchase courses, complete lessons, and earn token paybacks."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Auth domain
app.include_router(auth_router)

# Course domain
app.include_router(course_router)
app.include_router(lesson_router)
app.include_router(lesson_detail_router)
app.include_router(quiz_router)
app.include_router(quiz_detail_router)
app.include_router(quiz_answer_router)
app.include_router(quiz_answer_detail_router)
app.include_router(purchase_router)


@app.get(
    "/",
    summary="Health check",
    description="Simple health check endpoint that returns a greeting.",
    tags=["Health"],
)
async def read_root():
    return {"Hello": "World"}
