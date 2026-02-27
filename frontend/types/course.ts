export type Milestone = {
  id: string;
  title: string;
  question: string;         // Added for test view
  expectedCriteria: string; // Added for AI evaluation
  rewardTokens: number;
  rewardPAS?: number;       // Alternate name used in UI
  keywords: string[];
  expectedAnswer?: string;
};

export type Lesson = {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string | null;
  payback_amount: number | null;
  lesson_index: number;
  course_id: string | null;
  created_at: string;
  update_at: string | null;
  milestone?: Milestone | null; // Added relation
};

export type Course = {
  id: string;
  title: string | null;
  description: string | null;
  cost: number | null;
  wallet_address?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  update_at: string | null;
  lessons?: Lesson[];
};

export type CreateCourseInput = {
  title: string;
  description?: string;
  cost?: number | null;
  thumbnail_url?: string | null;
};

export type CreateLessonInput = {
  title: string;
  description?: string;
  video_url?: string;
  payback_amount?: number | null;
  lesson_index?: number;
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
