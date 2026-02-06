import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CoursePurchaseStatus } from '@/types/course';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
});

/**
 * GET /api/purchases?wallet_address=...
 * Get all courses purchased by a user
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('wallet_address');

  if (!walletAddress) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }

  // First get user_id from wallet_address
  const { data: user, error: userError } = await supabase
    .from('user')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    // User not found, return empty purchases
    return NextResponse.json({ purchases: [], courseIds: [] });
  }

  // Get all purchases for this user
  const { data: purchases, error: purchaseError } = await supabase
    .from('course_purchase')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', CoursePurchaseStatus.COMPLETED);

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  // Extract course_ids for quick lookup
  const courseIds = (purchases || []).map((p) => p.course_id);

  return NextResponse.json({ purchases: purchases || [], courseIds });
}

/**
 * POST /api/purchases
 * Create a new course purchase record
 * Body: { wallet_address, course_id, price_paid?, transaction_hash? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'JSON body required' }, { status: 400 });
  }

  const { wallet_address, course_id, price_paid, transaction_hash } = body;

  if (!wallet_address) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }

  if (!course_id) {
    return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
  }

  // Get or create user
  let { data: user, error: userError } = await supabase
    .from('user')
    .select('id')
    .eq('wallet_address', wallet_address)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // If user doesn't exist, create them as a student (role = 1)
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

  // Check if already purchased
  const { data: existing } = await supabase
    .from('course_purchase')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course_id)
    .eq('status', CoursePurchaseStatus.COMPLETED)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ 
      message: 'Already purchased', 
      purchase: existing,
      alreadyPurchased: true 
    });
  }

  // Create purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('course_purchase')
    .insert({
      user_id: user.id,
      course_id,
      price_paid: price_paid || null,
      status: CoursePurchaseStatus.COMPLETED,
    })
    .select()
    .single();

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    purchase,
    message: 'Course purchased successfully' 
  });
}
