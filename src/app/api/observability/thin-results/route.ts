import { NextResponse } from 'next/server';
import { initDailyThinResultsFile } from '@/lib/observability/reports';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await initDailyThinResultsFile();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}


