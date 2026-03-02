import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CoursePurchaseStatus } from '@/types/course';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * GET /api/lesson-progress?wallet_address=...&course_id=...
 * Returns the lesson_progress JSONB from course_purchase for a specific enrollment.
 * Response: { completedLessonIds: string[] }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('wallet_address');
  const courseId = searchParams.get('course_id');

  if (!walletAddress) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }
  if (!courseId) {
    return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
  }

  // Lookup user
  const { data: user, error: userError } = await supabase
    .from('user')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ completedLessonIds: [] });
  }

  // Get the purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('course_purchase')
    .select('lesson_progress')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('status', CoursePurchaseStatus.COMPLETED)
    .maybeSingle();

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  if (!purchase) {
    return NextResponse.json({ completedLessonIds: [] });
  }

  // lesson_progress is JSONB, expected shape: { completedLessonIds: string[] }
  const progress = purchase.lesson_progress as { completedLessonIds?: string[] } | null;
  const completedLessonIds = progress?.completedLessonIds || [];

  return NextResponse.json({ completedLessonIds });
}

/**
 * PUT /api/lesson-progress
 * Updates lesson_progress on course_purchase.
 * Body: { wallet_address, course_id, completed_lesson_id }
 * Adds the given lesson ID to the completedLessonIds array (idempotent).
 * Response: { completedLessonIds: string[] }
 */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'JSON body required' }, { status: 400 });
  }

  const { wallet_address, course_id, completed_lesson_id } = body;

  if (!wallet_address) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }
  if (!course_id) {
    return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
  }
  if (!completed_lesson_id) {
    return NextResponse.json({ error: 'completed_lesson_id is required' }, { status: 400 });
  }

  // Lookup user
  const { data: user, error: userError } = await supabase
    .from('user')
    .select('id')
    .eq('wallet_address', wallet_address)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get current purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('course_purchase')
    .select('id, lesson_progress')
    .eq('user_id', user.id)
    .eq('course_id', course_id)
    .eq('status', CoursePurchaseStatus.COMPLETED)
    .maybeSingle();

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }
  if (!purchase) {
    return NextResponse.json({ error: 'No enrollment found for this course' }, { status: 404 });
  }

  // Build updated completedLessonIds (idempotent — won't add duplicates)
  const currentProgress = purchase.lesson_progress as { completedLessonIds?: string[] } | null;
  const currentIds = currentProgress?.completedLessonIds || [];
  const updatedIds = currentIds.includes(completed_lesson_id)
    ? currentIds
    : [...currentIds, completed_lesson_id];

  // Update the record
  const { error: updateError } = await supabase
    .from('course_purchase')
    .update({
      lesson_progress: { completedLessonIds: updatedIds },
    })
    .eq('id', purchase.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ completedLessonIds: updatedIds });
}
