import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  if (!courseId) {
    return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
  }

  // Fetch course
  const { data: course, error } = await supabase
    .from('course')
    .select('id, title, description, cost, thumbnail_url, wallet_address, created_at, update_at')
    .eq('id', courseId)
    .single();

  if (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Fetch lessons separately
  const { data: lessons, error: lessonError } = await supabase
    .from('lesson')
    .select('id, title, description, video_url, payback_amount, lesson_index, course_id, created_at, update_at')
    .eq('course_id', courseId)
    .order('lesson_index', { ascending: true });

  if (lessonError) {
    console.error('Error fetching lessons:', lessonError);
    // Return course without lessons if lesson fetch fails
    return NextResponse.json({ courses: { ...course, lessons: [] } });
  }

  return NextResponse.json({ 
    courses: {
      ...course,
      lessons: lessons || []
    }
  });
}
