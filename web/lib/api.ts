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
  platform_wallet_address: string;
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

export interface YouTubeMetadata {
  title: string;
  description: string;
  duration: number | null;
  uploader: string | null;
  upload_date: string | null;
  success: boolean;
}

export interface CoursePurchase {
  id: string;
  course_id: string;
  user_id: string;
  amount: number;
  platform_fee_amount: number;
  payback_reserve_amount: number;
  teacher_payout_amount: number;
  teacher_payout_hash: string | null;
  status: string;
  transaction_hash: string;
  created_at: string;
  updated_at: string;
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
}

export interface CoursePurchaseCreate {
  course_id: string;
  transaction_hash: string;
  block_hash?: string;
}

export interface GenerateQuizRequest {
  num_questions?: number;
}

export interface GenerateQuizFromDataRequest {
  title: string;
  description: string;
  video_url?: string | null;
  num_questions?: number;
}

export interface QuizData {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
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
  payback_sent: boolean;
  payback_tx_hash: string | null;
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
  payback_sent: boolean;
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
// x402 V2 protocol types
// ---------------------------------------------------------------------------

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

export interface PaymentRequirements {
  scheme: string; // "exact"
  network: string; // "polkadot:paseo"
  maxAmountRequired: string; // planck as string
  asset: string; // "PAS"
  payTo: string; // SS58 platform wallet
  maxTimeoutSeconds: number;
  extra?: {
    courseId?: string;
    courseTitle?: string;
    price?: number;
  };
}

/** Decoded from the PAYMENT-REQUIRED response header (Base64 JSON). */
export interface X402PaymentRequired {
  x402Version: number;
  resource: ResourceInfo;
  accepts: PaymentRequirements[];
}

/** On-chain proof returned by the payment dialog. */
export interface PaymentProof {
  transactionHash: string;
  blockHash: string;
}

/** Sent in the PAYMENT-SIGNATURE request header (Base64 JSON). */
export interface PaymentPayload {
  x402Version: number;
  accepted: PaymentRequirements;
  payload: PaymentProof;
}

/** Decoded from the PAYMENT-RESPONSE header (Base64 JSON). */
export interface SettleResponse {
  success: boolean;
  transaction: string;
  network: string;
  payer?: string;
}

// ---------------------------------------------------------------------------
// API error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: string;
  /** x402 payment requirements (decoded from PAYMENT-REQUIRED header). */
  paymentRequired?: X402PaymentRequired;

  constructor(
    status: number,
    detail: string,
    paymentRequired?: X402PaymentRequired,
  ) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.paymentRequired = paymentRequired;
  }
}

// ---------------------------------------------------------------------------
// Token management (connected to auth store)
// ---------------------------------------------------------------------------

let _getAccessToken: (() => string | null) | null = null;
let _refreshTokens: (() => Promise<void>) | null = null;

/**
 * Called once from providers.tsx to wire up the auth store to the API client.
 * This avoids circular imports between api.ts and auth-store.ts.
 */
export function connectAuthToApi(
  getAccessToken: () => string | null,
  refreshTokens: () => Promise<void>,
) {
  _getAccessToken = getAccessToken;
  _refreshTokens = refreshTokens;
}

// ---------------------------------------------------------------------------
// 402 handler (connected to x402 agent)
// ---------------------------------------------------------------------------

let _handle402:
  | ((info: X402PaymentRequired) => Promise<PaymentProof | null>)
  | null = null;

/**
 * Called once from providers.tsx to wire up the x402 payment agent.
 * The handler returns a PaymentProof if payment succeeded (retry with
 * PAYMENT-SIGNATURE header), or null if the user cancelled.
 */
export function connectPaymentAgent(
  handler: (info: X402PaymentRequired) => Promise<PaymentProof | null>,
) {
  _handle402 = handler;
}

// ---------------------------------------------------------------------------
// Base64 helpers for x402 headers
// ---------------------------------------------------------------------------

function b64Encode(obj: unknown): string {
  return btoa(JSON.stringify(obj));
}

function b64Decode<T = unknown>(value: string): T {
  // Be lenient with padding
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return JSON.parse(atob(padded)) as T;
}

// ---------------------------------------------------------------------------
// Core fetch with auth headers + token refresh + 402 intercept
// ---------------------------------------------------------------------------

async function authFetch(
  url: string,
  init?: RequestInit,
  _retried = false,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  // Inject auth header if we have a token
  const token = _getAccessToken?.();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  // 401 — try refresh once, then retry
  if (res.status === 401 && !_retried && _refreshTokens) {
    try {
      await _refreshTokens();
      return authFetch(url, init, true);
    } catch {
      // Refresh failed — propagate the 401
    }
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // 402 — read PAYMENT-REQUIRED header (x402 V2)
    if (res.status === 402) {
      const headerValue = res.headers.get("PAYMENT-REQUIRED");
      if (headerValue) {
        try {
          const paymentRequired = b64Decode<X402PaymentRequired>(headerValue);
          throw new ApiError(
            402,
            "Payment required",
            paymentRequired,
          );
        } catch (e) {
          if (e instanceof ApiError) throw e;
          // Failed to decode header — fall through to generic 402
        }
      }
      const body = await res.json().catch(() => ({}));
      throw new ApiError(402, body.error ?? body.detail ?? "Payment required");
    }

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

/**
 * Authenticated fetch that also handles 402 via x402 protocol.
 * If a 402 is caught with a PAYMENT-REQUIRED header and the payment
 * agent is connected, it:
 * 1. Prompts the user to pay (opens the x402 dialog)
 * 2. User sends PAS on-chain and returns {transactionHash, blockHash}
 * 3. Retries the original request with PAYMENT-SIGNATURE header
 * 4. Server verifies on-chain, records purchase, returns data + PAYMENT-RESPONSE
 */
async function fetchWithPaymentRetry<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  try {
    const res = await authFetch(url, init);
    return await handleResponse<T>(res);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 402 &&
      err.paymentRequired &&
      _handle402
    ) {
      const proof = await _handle402(err.paymentRequired);
      if (proof) {
        // Build the PAYMENT-SIGNATURE header (x402 V2)
        const accepted = err.paymentRequired.accepts[0];
        const paymentPayload: PaymentPayload = {
          x402Version: 2,
          accepted,
          payload: proof,
        };
        const sigHeader = b64Encode(paymentPayload);

        // Retry with PAYMENT-SIGNATURE
        const retryHeaders = new Headers(init?.headers);
        retryHeaders.set("PAYMENT-SIGNATURE", sigHeader);
        const res = await authFetch(url, { ...init, headers: retryHeaders });
        return await handleResponse<T>(res);
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// YouTube Utilities
// ---------------------------------------------------------------------------

export const youtubeApi = {
  /** Get metadata for a YouTube video URL. */
  getMetadata: (url: string) => {
    const params = new URLSearchParams({ url });
    return authFetch(
      `${API_BASE}/courses/youtube/metadata?${params.toString()}`,
    ).then(handleResponse<YouTubeMetadata>);
  },
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  list: (offset = 0, limit = 100) =>
    authFetch(`${API_BASE}/users?offset=${offset}&limit=${limit}`).then(
      handleResponse<User[]>,
    ),

  getByWallet: (wallet: string) =>
    authFetch(`${API_BASE}/users/wallet/${encodeURIComponent(wallet)}`).then(
      handleResponse<User>,
    ),

  create: (data: UserCreate) =>
    authFetch(`${API_BASE}/users`, { method: "POST", ...json(data) }).then(
      handleResponse<User>,
    ),

  update: (id: string, data: UserUpdate) =>
    authFetch(`${API_BASE}/users/${id}`, {
      method: "PATCH",
      ...json(data),
    }).then(handleResponse<User>),
};

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const coursesApi = {
  list: (offset = 0, limit = 100) =>
    authFetch(`${API_BASE}/courses?offset=${offset}&limit=${limit}`).then(
      handleResponse<Course[]>,
    ),

  get: (id: string) =>
    authFetch(`${API_BASE}/courses/${id}`).then(handleResponse<Course>),

  create: (data: CourseCreate) =>
    authFetch(`${API_BASE}/courses`, { method: "POST", ...json(data) }).then(
      handleResponse<CourseWithLessonsResponse>,
    ),

  update: (id: string, data: CourseUpdate) =>
    authFetch(`${API_BASE}/courses/${id}`, {
      method: "PUT",
      ...json(data),
    }).then(handleResponse<CourseWithLessonsResponse>),

  delete: (id: string) =>
    authFetch(`${API_BASE}/courses/${id}`, { method: "DELETE" }).then(
      handleResponse<void>,
    ),
};

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export const lessonsApi = {
  listByCourse: (courseId: string, offset = 0, limit = 100) =>
    authFetch(
      `${API_BASE}/courses/${courseId}/lessons?offset=${offset}&limit=${limit}`,
    ).then(handleResponse<Lesson[]>),

  get: (id: string) =>
    fetchWithPaymentRetry<Lesson>(`${API_BASE}/lessons/${id}`),
};

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export const quizzesApi = {
  listByLesson: (lessonId: string, offset = 0, limit = 100) =>
    fetchWithPaymentRetry<Quiz[]>(
      `${API_BASE}/lessons/${lessonId}/quizzes?offset=${offset}&limit=${limit}`,
    ),

  generate: (lessonId: string, data?: GenerateQuizRequest) =>
    authFetch(`${API_BASE}/lessons/${lessonId}/quizzes/generate`, {
      method: "POST",
      ...json(data ?? {}),
    }).then(handleResponse<Quiz[]>),

  generateFromData: (data: GenerateQuizFromDataRequest) =>
    authFetch(`${API_BASE}/courses/quizzes/generate-from-data`, {
      method: "POST",
      ...json(data),
    }).then(handleResponse<QuizData[]>),
};

// ---------------------------------------------------------------------------
// Quiz Answers
// ---------------------------------------------------------------------------

export const quizAnswersApi = {
  create: (quizId: string, data: QuizAnswerCreate) =>
    authFetch(`${API_BASE}/quizzes/${quizId}/answers`, {
      method: "POST",
      ...json(data),
    }).then(handleResponse<QuizAnswer>),
};

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export const purchasesApi = {
  list: (params?: { course_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.course_id) q.set("course_id", params.course_id);
    return authFetch(`${API_BASE}/purchases?${q.toString()}`).then(
      handleResponse<CoursePurchase[]>,
    );
  },

  create: (data: CoursePurchaseCreate) =>
    authFetch(`${API_BASE}/purchases`, { method: "POST", ...json(data) }).then(
      handleResponse<CoursePurchase>,
    ),
};

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export const progressApi = {
  /** Get quiz results for a specific lesson for the authenticated user. */
  lessonProgress: (lessonId: string) =>
    authFetch(`${API_BASE}/lessons/${lessonId}/progress`).then(
      handleResponse<LessonProgress>,
    ),

  /** Get overall course progress for the authenticated user. */
  courseProgress: (courseId: string) =>
    authFetch(`${API_BASE}/courses/${courseId}/progress`).then(
      handleResponse<CourseProgress>,
    ),
};
