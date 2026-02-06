import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseSchema = 'public';

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: supabaseSchema },
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet_address');

  if (!wallet) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }

  const { data: user, error: userError } = await supabase
    .from('user')
    .select('id, role')
    .eq('wallet_address', wallet)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!user || user.role !== 2) {
    return NextResponse.json({ error: 'Only teachers can view their created courses' }, { status: 403 });
  }

  const { data: courses, error } = await supabase
    .from('course')
    .select('id, title, description, cost, wallet_address, created_at, update_at')
    .eq('wallet_address', wallet);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ courses });
}