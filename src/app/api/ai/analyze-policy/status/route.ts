import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getPolicyUploadById } from '@/lib/supabase-policy';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapDbStatus(dbStatus?: string | null): { status: 'queued'|'extracting'|'analyzing'|'summarizing'|'done'|'error'; progress: number } {
  switch ((dbStatus || '').toLowerCase()) {
    case 'uploading':
      return { status: 'queued', progress: 10 };
    case 'processing':
      // coarse mapping; client will smooth Extracting→Analyzing→Summarizing
      return { status: 'analyzing', progress: 60 };
    case 'completed':
      return { status: 'done', progress: 100 };
    case 'error':
      return { status: 'error', progress: 0 };
    default:
      return { status: 'queued', progress: 10 };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authedUserId: string | null = (session?.user as any)?.id || null;

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    const sig = searchParams.get('sig');
    if (!uploadId) {
      return NextResponse.json({ error: 'missing_upload_id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    let supa;
    try {
      supa = createServerSupabaseClient();
    } catch (e) {
      return NextResponse.json({ error: 'server_db_not_configured' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: row, error } = await getPolicyUploadById(supa as any, uploadId);
    if (error || !row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    const statusSecret = process.env.UPLOAD_STATUS_SECRET || '';
    const expectedSig = createHmac('sha256', statusSecret).update(uploadId).digest('hex');
    const sigOk = !!sig && sig === expectedSig;

    const ownerOk = !!authedUserId && (row.user_id as string | null) === authedUserId;
    if (!ownerOk && !sigOk) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    const mapped = mapDbStatus(row.status as string | null | undefined);
    const updatedAt: string = row.updated_at || row.upload_time || row.created_at || new Date().toISOString();

    return NextResponse.json(
      { status: mapped.status, progress: mapped.progress, updatedAt },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: 'internal_error', message: String(e) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}


