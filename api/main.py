from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

# Import database first to set naming conventions before models register
from src.database import engine  # noqa: F401

# Import all models so SQLModel metadata is fully populated
from src.auth.models import User  # noqa: F401
from src.course.models import (  # noqa: F401
    Course,
    CoursePurchase,
    Lesson,
    PaybackTransaction,
    Quiz,
    QuizAnswer,
)

from src.auth.router import auth_router, router as user_router
from src.course.router import (
    course_router,
    lesson_detail_router,
    lesson_router,
    progress_router,
    purchase_router,
    quiz_answer_router,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth domain
app.include_router(auth_router)  # /auth/* (challenge, login, register, refresh, me)
app.include_router(user_router)  # /users/* (list, get by wallet, update, delete)

# Course domain
app.include_router(course_router)
app.include_router(lesson_router)
app.include_router(lesson_detail_router)
app.include_router(quiz_router)
app.include_router(quiz_answer_router)
app.include_router(progress_router)
app.include_router(purchase_router)
