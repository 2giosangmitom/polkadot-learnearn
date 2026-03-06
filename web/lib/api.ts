const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "Teacher" | "Student";

export interface User {
  id: string;
  wallet_address: string;
  display_name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  payback_amount: number;
  course_id: string;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
  lesson_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuizAnswer {
  id: string;
  quiz_id: string;
  selected_option: number;
  user_id: string;
}

export interface CoursePurchase {
  id: string;
  course_id: string;
  user_id: string;
  transaction_hash: string;
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface UserCreate {
  wallet_address: string;
  display_name: string;
  role: Role;
}

export interface UserUpdate {
  display_name?: string;
}

export interface CourseCreate {
  title: string;
  description: string;
  price: number;
  author_id: string;
}

export interface CourseUpdate {
  title?: string;
  description?: string;
  price?: number;
}

export interface LessonCreate {
  title: string;
  description: string;
  video_url: string;
  payback_amount: number;
}

export interface LessonUpdate {
  title?: string;
  description?: string;
  video_url?: string;
  payback_amount?: number;
}

export interface QuizCreate {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
}

export interface QuizAnswerCreate {
  quiz_id: string;
  selected_option: number;
  user_id: string;
}

export interface CoursePurchaseCreate {
  course_id: string;
  user_id: string;
  transaction_hash: string;
}

export interface GenerateQuizRequest {
  num_questions?: number;
}

// ---------------------------------------------------------------------------
// API error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function json(body: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  list: (offset = 0, limit = 100) =>
    fetch(`${API_BASE}/users?offset=${offset}&limit=${limit}`).then(
      handleResponse<User[]>
    ),

  getByWallet: (wallet: string) =>
    fetch(`${API_BASE}/users/wallet/${encodeURIComponent(wallet)}`).then(
      handleResponse<User>
    ),

  create: (data: UserCreate) =>
    fetch(`${API_BASE}/users`, { method: "POST", ...json(data) }).then(
      handleResponse<User>
    ),

  update: (id: string, data: UserUpdate) =>
    fetch(`${API_BASE}/users/${id}`, { method: "PATCH", ...json(data) }).then(
      handleResponse<User>
    ),

  delete: (id: string) =>
    fetch(`${API_BASE}/users/${id}`, { method: "DELETE" }).then(
      handleResponse<void>
    ),
};

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const coursesApi = {
  list: (offset = 0, limit = 100) =>
    fetch(`${API_BASE}/courses?offset=${offset}&limit=${limit}`).then(
      handleResponse<Course[]>
    ),

  get: (id: string) =>
    fetch(`${API_BASE}/courses/${id}`).then(handleResponse<Course>),

  create: (data: CourseCreate) =>
    fetch(`${API_BASE}/courses`, { method: "POST", ...json(data) }).then(
      handleResponse<Course>
    ),

  update: (id: string, data: CourseUpdate) =>
    fetch(`${API_BASE}/courses/${id}`, {
      method: "PATCH",
      ...json(data),
    }).then(handleResponse<Course>),

  delete: (id: string) =>
    fetch(`${API_BASE}/courses/${id}`, { method: "DELETE" }).then(
      handleResponse<void>
    ),
};

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export const lessonsApi = {
  listByCourse: (courseId: string, offset = 0, limit = 100) =>
    fetch(
      `${API_BASE}/courses/${courseId}/lessons?offset=${offset}&limit=${limit}`
    ).then(handleResponse<Lesson[]>),

  get: (id: string) =>
    fetch(`${API_BASE}/lessons/${id}`).then(handleResponse<Lesson>),

  create: (courseId: string, data: LessonCreate) =>
    fetch(`${API_BASE}/courses/${courseId}/lessons`, {
      method: "POST",
      ...json(data),
    }).then(handleResponse<Lesson>),

  update: (id: string, data: LessonUpdate) =>
    fetch(`${API_BASE}/lessons/${id}`, {
      method: "PATCH",
      ...json(data),
    }).then(handleResponse<Lesson>),

  delete: (id: string) =>
    fetch(`${API_BASE}/lessons/${id}`, { method: "DELETE" }).then(
      handleResponse<void>
    ),
};

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export const quizzesApi = {
  listByLesson: (lessonId: string, offset = 0, limit = 100) =>
    fetch(
      `${API_BASE}/lessons/${lessonId}/quizzes?offset=${offset}&limit=${limit}`
    ).then(handleResponse<Quiz[]>),

  get: (id: string) =>
    fetch(`${API_BASE}/quizzes/${id}`).then(handleResponse<Quiz>),

  create: (lessonId: string, data: QuizCreate) =>
    fetch(`${API_BASE}/lessons/${lessonId}/quizzes`, {
      method: "POST",
      ...json(data),
    }).then(handleResponse<Quiz>),

  generate: (lessonId: string, data?: GenerateQuizRequest) =>
    fetch(`${API_BASE}/lessons/${lessonId}/quizzes/generate`, {
      method: "POST",
      ...json(data ?? {}),
    }).then(handleResponse<Quiz[]>),

  update: (id: string, data: Partial<QuizCreate>) =>
    fetch(`${API_BASE}/quizzes/${id}`, {
      method: "PATCH",
      ...json(data),
    }).then(handleResponse<Quiz>),

  delete: (id: string) =>
    fetch(`${API_BASE}/quizzes/${id}`, { method: "DELETE" }).then(
      handleResponse<void>
    ),
};

// ---------------------------------------------------------------------------
// Quiz Answers
// ---------------------------------------------------------------------------

export const quizAnswersApi = {
  listByQuiz: (quizId: string, offset = 0, limit = 100) =>
    fetch(
      `${API_BASE}/quizzes/${quizId}/answers?offset=${offset}&limit=${limit}`
    ).then(handleResponse<QuizAnswer[]>),

  get: (id: string) =>
    fetch(`${API_BASE}/quiz-answers/${id}`).then(handleResponse<QuizAnswer>),

  create: (quizId: string, data: QuizAnswerCreate) =>
    fetch(`${API_BASE}/quizzes/${quizId}/answers`, {
      method: "POST",
      ...json(data),
    }).then(handleResponse<QuizAnswer>),

  delete: (id: string) =>
    fetch(`${API_BASE}/quiz-answers/${id}`, { method: "DELETE" }).then(
      handleResponse<void>
    ),
};

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export const purchasesApi = {
  list: (params?: { course_id?: string; user_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.course_id) q.set("course_id", params.course_id);
    if (params?.user_id) q.set("user_id", params.user_id);
    return fetch(`${API_BASE}/purchases?${q.toString()}`).then(
      handleResponse<CoursePurchase[]>
    );
  },

  get: (id: string) =>
    fetch(`${API_BASE}/purchases/${id}`).then(
      handleResponse<CoursePurchase>
    ),

  create: (data: CoursePurchaseCreate) =>
    fetch(`${API_BASE}/purchases`, { method: "POST", ...json(data) }).then(
      handleResponse<CoursePurchase>
    ),

  delete: (id: string) =>
    fetch(`${API_BASE}/purchases/${id}`, { method: "DELETE" }).then(
      handleResponse<void>
    ),
};
