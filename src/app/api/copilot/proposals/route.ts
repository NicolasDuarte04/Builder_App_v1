// Legacy insert-only endpoint; superseded by /api/proposals/generate for PDF generation.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

import { env, getPublicEnv } from '@/lib/env';
const SUPABASE_URL = env.server.SUPABASE_URL || getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = getPublicEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('[ENV] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function POST(req: NextRequest) {
  const { broker_id, client_id, brief_id, shortlist } = await req.json();

  const { data, error } = await supabase
    .from('proposals')
    .insert({ broker_id, client_id, brief_id, shortlist })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}


