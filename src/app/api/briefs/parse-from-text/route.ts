import { NextRequest, NextResponse } from 'next/server';
import { parseBriefFromText } from '@/lib/briefParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === 'string' ? body.text : '';
    const locale = body?.locale === 'en' ? 'en' : 'es';

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: 'schema_mismatch' });
    }

    const result = await parseBriefFromText(text, locale);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[parse-from-text] error:', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}


