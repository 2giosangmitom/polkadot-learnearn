// Learning Modules Data

export interface Module {
  id: string;
  title: string | null;
  description: string | null;
  tuition: number; // course cost in DOT (or chain native)
  lessonsCount?: number;
}

// Supabase-backed courses will be fetched at runtime; static modules removed.
export const MODULES: Module[] = [];
