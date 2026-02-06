import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseKey)
	throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');

const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET() {
	const { data, error } = await supabase
		.from('course')
		.select('id, title, description, cost')
		.order('created_at', { ascending: false });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const courses = (data || []).map((course: any) => ({
		id: course.id,
		title: course.title,
		description: course.description,
		cost: course.cost,
	}));

	return NextResponse.json({ courses });
}
