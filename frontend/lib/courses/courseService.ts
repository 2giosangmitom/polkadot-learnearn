import { Course, CreateCourseInput, CreateLessonInput, Lesson } from '@/types/course';
import { supabase } from '../supabase/client';

const TEACHER_ROLE = 2;

async function ensureTeacher(walletAddress: string) {
  const { data, error } = await supabase
    .from('user')
    .select('role')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify role: ${error.message}`);
  }

  if (!data || data.role !== TEACHER_ROLE) {
    throw new Error('Only teachers are allowed to perform this action.');
  }

  return data;
}

export async function getCourses() {
  const { data, error } = await supabase
    .from('course')
    .select('id, title, description, cost, wallet_address, thumbnail_url, created_at, update_at');

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  return data as Course[];
}

export async function getCourseById(id: string) {
  const { data: course, error: courseError } = await supabase
    .from('course')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (courseError) {
    throw new Error(`Failed to fetch course: ${courseError.message}`);
  }

  if (!course) return null;

  // Fetch lessons separately
  const { data: lessons, error: lessonError } = await supabase
    .from('lesson')
    .select('id, title, description, video_url, payback_amount, course_id, created_at, update_at')
    .eq('course_id', id)
    .order('created_at', { ascending: true });

  if (lessonError) {
    console.error('Failed to fetch lessons:', lessonError.message);
  }

  return { ...course, lesson: lessons || [] } as Course & { lesson?: Lesson[] };
}

export async function getCoursesByUser(walletAddress: string) {
  await ensureTeacher(walletAddress);

  const { data, error } = await supabase
    .from('course')
    .select('id, title, description, cost, wallet_address, thumbnail_url, created_at, update_at')
    .eq('wallet_address', walletAddress);

  if (error) {
    throw new Error(`Failed to fetch teacher courses: ${error.message}`);
  }

  return data as Course[];
}

export async function createCourse(
  payload: CreateCourseInput & {
    lessons?: CreateLessonInput[];
    wallet_address: string;
  },
) {
  await ensureTeacher(payload.wallet_address);

  const { data: newCourse, error: courseError } = await supabase
    .from('course')
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      cost: payload.cost ?? null,
      wallet_address: payload.wallet_address,
      thumbnail_url: payload.thumbnail_url ?? null,
    })
    .select('id, title, description, cost, wallet_address, thumbnail_url, created_at, update_at')
    .single();

  if (courseError) {
    throw new Error(`Failed to create course: ${courseError.message}`);
  }

  if (payload.lessons?.length) {
    const lessonsToInsert = payload.lessons
      .filter((lesson) => lesson.title)
      .map((lesson) => ({
        title: lesson.title,
        description: lesson.description ?? null,
        video_url: lesson.video_url ?? null,
        payback_amount: lesson.payback_amount ?? null,
        course_id: newCourse.id,
      }));

    if (lessonsToInsert.length) {
      const { error: lessonError } = await supabase.from('lesson').insert(lessonsToInsert);
      if (lessonError) {
        throw new Error(`Failed to create lessons: ${lessonError.message}`);
      }
    }
  }

  return newCourse as Course;
}
  
export async function createLesson(
  courseId: string,
  payload: CreateLessonInput & { wallet_address: string },
) {
  await ensureTeacher(payload.wallet_address);

  const { data, error } = await supabase
    .from('lesson')
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      video_url: payload.video_url ?? null,
      payback_amount: payload.payback_amount ?? null,
      course_id: courseId,
    })
    .select('id, title, description, video_url, payback_amount, course_id, created_at, update_at')
    .single();

  if (error) {
    throw new Error(`Failed to create lesson: ${error.message}`);
  }

  return data as Lesson;
}

export async function updateCourse(
  id: string,
  data: Partial<CreateCourseInput>,
  walletAddress: string,
): Promise<Course> {
  await ensureTeacher(walletAddress);

  const { data: updated, error } = await supabase
    .from('course')
    .update({
      ...data,
      update_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, title, description, cost, wallet_address, thumbnail_url, created_at, update_at')
    .single();

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }

  return updated as Course;
}

export async function updateLesson(
  id: string,
  data: Partial<CreateLessonInput>,
  walletAddress: string,
): Promise<Lesson> {
  await ensureTeacher(walletAddress);

  const { data: updated, error } = await supabase
    .from('lesson')
    .update({
      ...data,
      update_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, title, description, video_url, payback_amount, course_id, created_at, update_at')
    .single();

  if (error) {
    throw new Error(`Failed to update lesson: ${error.message}`);
  }

  return updated as Lesson;
}
