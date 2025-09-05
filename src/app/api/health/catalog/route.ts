import { NextResponse } from 'next/server';
// Lazy import to avoid env evaluation during static analysis

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { q } = await import('@/lib/db-catalog');
    const rows = await q<{ ok: number }>('select 1 as ok', []);
    return NextResponse.json({ ok: rows?.[0]?.ok === 1 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}


