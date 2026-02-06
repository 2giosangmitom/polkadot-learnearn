import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side client uses service role key to bypass RLS for trusted operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseSchema ='public';

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

  const { data, error } = await supabase
    .from('user')
    .select('*')
    .eq('wallet_address', wallet)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const wallet_address = body?.wallet_address as string | undefined;
  const display_name = (body?.display_name as string | undefined) || null;
  const incomingRole = body?.role as string | number | undefined;

  // Map role to int2: 1 = student, 2 = teacher
  const role = (() => {
    if (typeof incomingRole === 'number') {
      return incomingRole === 2 ? 2 : 1;
    }
    if (typeof incomingRole === 'string') {
      return incomingRole.toLowerCase() === 'teacher' ? 2 : 1;
    }
    return 1;
  })();

  if (!wallet_address) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user')
    .upsert(
      { wallet_address, display_name, role },
      { onConflict: 'wallet_address' }
    )
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
