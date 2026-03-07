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
  author_wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  payback_amount: number;
  lesson_index: number;
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
  quiz_index: number;
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

export interface QuizUpsert {
  id?: string | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
  quiz_index: number;
}

export interface LessonUpsert {
  id?: string | null;
  title: string;
  description: string;
  video_url: string;
  payback_amount: number;
  lesson_index: number;
  quizzes: QuizUpsert[];
}

export interface CourseCreate {
  title: string;
  description: string;
  price: number;
  author_id: string;
  lessons: LessonUpsert[];
}

export interface CourseUpdate {
  title: string;
  description: string;
  price: number;
  lessons: LessonUpsert[];
}

export interface LessonWithQuizzes extends Lesson {
  quizzes: Quiz[];
}

export interface CourseWithLessonsResponse extends Course {
  lessons: LessonWithQuizzes[];
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
  block_hash?: string;
}

export interface GenerateQuizRequest {
  num_questions?: number;
}

// Progress / Results types
export interface QuizResultItem {
  quiz_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
  selected_option: number | null;
  is_correct: boolean;
}

export interface LessonProgress {
  lesson_id: string;
  total_questions: number;
  answered: number;
  correct: number;
  score_pct: number;
  completed: boolean;
  passed: boolean;
  results: QuizResultItem[];
}

export interface LessonProgressSummary {
  lesson_id: string;
  lesson_title: string;
  lesson_index: number;
  payback_amount: number;
  total_questions: number;
  answered: number;
  correct: number;
  score_pct: number;
  completed: boolean;
  passed: boolean;
}

export interface CourseProgress {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  passed_lessons: number;
  total_earned: number;
  lessons: LessonProgressSummary[];
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
      handleResponse<CourseWithLessonsResponse>
    ),

  update: (id: string, data: CourseUpdate) =>
    fetch(`${API_BASE}/courses/${id}`, { method: "PUT", ...json(data) }).then(
      handleResponse<CourseWithLessonsResponse>
    ),

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
};

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export const quizzesApi = {
  listByLesson: (lessonId: string, offset = 0, limit = 100) =>
    fetch(
      `${API_BASE}/lessons/${lessonId}/quizzes?offset=${offset}&limit=${limit}`
    ).then(handleResponse<Quiz[]>),

  generate: (lessonId: string, data?: GenerateQuizRequest) =>
    fetch(`${API_BASE}/lessons/${lessonId}/quizzes/generate`, {
      method: "POST",
      ...json(data ?? {}),
    }).then(handleResponse<Quiz[]>),
};

// ---------------------------------------------------------------------------
// Quiz Answers
// ---------------------------------------------------------------------------

export const quizAnswersApi = {
  create: (quizId: string, data: QuizAnswerCreate) =>
    fetch(`${API_BASE}/quizzes/${quizId}/answers`, {
      method: "POST",
      ...json(data),
    }).then(handleResponse<QuizAnswer>),
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

  create: (data: CoursePurchaseCreate) =>
    fetch(`${API_BASE}/purchases`, { method: "POST", ...json(data) }).then(
      handleResponse<CoursePurchase>
    ),
};

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export const progressApi = {
  /** Get quiz results for a specific lesson for a specific user. */
  lessonProgress: (lessonId: string, userId: string) =>
    fetch(`${API_BASE}/lessons/${lessonId}/progress/${userId}`).then(
      handleResponse<LessonProgress>
    ),

  /** Get overall course progress for a specific user. */
  courseProgress: (courseId: string, userId: string) =>
    fetch(`${API_BASE}/courses/${courseId}/progress/${userId}`).then(
      handleResponse<CourseProgress>
    ),
};
