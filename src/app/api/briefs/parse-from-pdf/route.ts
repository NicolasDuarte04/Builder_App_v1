import { NextRequest, NextResponse } from 'next/server';
import { parseBriefFromPdf } from '@/lib/briefParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    if (!uploadId) {
      return NextResponse.json({ error: 'missing_upload_id' }, { status: 400 });
    }
    const result = await parseBriefFromPdf(uploadId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[parse-from-pdf] error:', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}


