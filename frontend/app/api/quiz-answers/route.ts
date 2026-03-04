import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * GET /api/quiz-answers?wallet_address=...&lesson_id=...
 * Load saved quiz answers for a user on a specific lesson.
 * Returns { answers: { [quiz_id]: selected_option } }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('wallet_address');
  const lessonId = searchParams.get('lesson_id');

  if (!walletAddress || !lessonId) {
    return NextResponse.json(
      { error: 'wallet_address and lesson_id are required' },
      { status: 400 }
    );
  }

  // Look up user by wallet address
  const { data: user, error: userError } = await supabase
    .from('user')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ answers: {} });
  }

  // Get quiz IDs for this lesson
  const { data: quizzes, error: quizError } = await supabase
    .from('lesson_quiz')
    .select('id')
    .eq('lesson_id', lessonId);

  if (quizError) {
    return NextResponse.json({ error: quizError.message }, { status: 500 });
  }

  if (!quizzes || quizzes.length === 0) {
    return NextResponse.json({ answers: {} });
  }

  const quizIds = quizzes.map((q) => q.id);

  // Get saved answers for these quizzes by this user
  const { data: savedAnswers, error: answerError } = await supabase
    .from('quiz_answer')
    .select('quiz_id, selected_option')
    .eq('user_id', user.id)
    .in('quiz_id', quizIds);

  if (answerError) {
    return NextResponse.json({ error: answerError.message }, { status: 500 });
  }

  // Build a map: quiz_id -> selected_option
  const answers: Record<string, number> = {};
  for (const row of savedAnswers || []) {
    answers[row.quiz_id] = row.selected_option;
  }

  return NextResponse.json({ answers });
}

/**
 * POST /api/quiz-answers
 * Submit quiz answers for a user.
 * Body: { wallet_address, answers: { [quiz_id]: selected_option } }
 * Upserts rows in quiz_answer — one row per quiz per user.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'JSON body required' }, { status: 400 });
  }

  const { wallet_address, answers } = body as {
    wallet_address?: string;
    answers?: Record<string, number>;
  };

  if (!wallet_address) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }

  if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
    return NextResponse.json({ error: 'answers map is required' }, { status: 400 });
  }

  // Look up or create user
  // eslint-disable-next-line prefer-const
  let { data: user, error: userError } = await supabase
    .from('user')
    .select('id')
    .eq('wallet_address', wallet_address)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    const { data: newUser, error: createError } = await supabase
      .from('user')
      .insert({ wallet_address, role: 1 })
      .select('id')
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    user = newUser;
  }

  // For each quiz answer, upsert into quiz_answer
  // First, check which quiz_answer rows already exist for this user + these quizzes
  const quizIds = Object.keys(answers);

  const { data: existingAnswers, error: fetchError } = await supabase
    .from('quiz_answer')
    .select('id, quiz_id')
    .eq('user_id', user.id)
    .in('quiz_id', quizIds);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const existingMap = new Map<string, string>();
  for (const row of existingAnswers || []) {
    existingMap.set(row.quiz_id, row.id);
  }

  // Split into updates and inserts
  const toUpdate: { id: string; selected_option: number }[] = [];
  const toInsert: { quiz_id: string; user_id: number; selected_option: number }[] = [];

  for (const [quizId, selectedOption] of Object.entries(answers)) {
    const existingId = existingMap.get(quizId);
    if (existingId) {
      toUpdate.push({ id: existingId, selected_option: selectedOption });
    } else {
      toInsert.push({ quiz_id: quizId, user_id: user.id, selected_option: selectedOption });
    }
  }

  // Perform updates
  for (const row of toUpdate) {
    const { error } = await supabase
      .from('quiz_answer')
      .update({ selected_option: row.selected_option })
      .eq('id', row.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Perform inserts
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('quiz_answer')
      .insert(toInsert);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Saved ${toInsert.length} new answer(s), updated ${toUpdate.length} existing answer(s)`,
  });
}
