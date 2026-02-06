export type Milestone = {
  id: string;
  title: string;
  rewardTokens: number;
  keywords: string[];
  expectedAnswer?: string;
};

export type Lesson = {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string | null;
  payback_amount: number | null;
  course_id: string | null;
  created_at: string;
  update_at: string | null;
};

export type Course = {
  id: string;
  title: string | null;
  description: string | null;
  cost: number | null;
  wallet_address?: string | null;
  created_at: string;
  update_at: string | null;
  lessons?: Lesson[];
};

export type CreateCourseInput = {
  title: string;
  description?: string;
  cost?: number | null;
};

export type CreateLessonInput = {
  title: string;
  description?: string;
  video_url?: string;
  payback_amount?: number | null;
};

// Course purchase status enum
export enum CoursePurchaseStatus {
  PENDING = 0,
  COMPLETED = 1,
  REFUNDED = 2,
}

export type CoursePurchase = {
  id: number;
  user_id: number;
  course_id: string;
  purchased_at: string;
  price_paid: number | null;
  status: CoursePurchaseStatus;
};

export type CreateCoursePurchaseInput = {
  wallet_address: string;
  course_id: string;
  price_paid?: number | null;
  transaction_hash?: string;
};
