import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { upsertBrief, getBriefById } from '@/lib/supabase/briefs';
import { Brief } from '@/types/brief';

export const runtime = 'nodejs';

/**
 * GET /api/briefs/[id]
 * Retrieve a specific brief by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = (session.user as any).id || session.user.email;

    // Use authenticated client for RLS
    const accessToken = (session as any).accessToken;
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    // Fetch the brief using the new function
    const brief = await getBriefById(supabase, params.id);

    if (!brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    // Validate the brief userId matches the authenticated user
    if (brief.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized: userId mismatch' }, { status: 403 });
    }

    return NextResponse.json({ brief }, { status: 200 });
  } catch (error) {
    console.error('Error fetching brief:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/briefs/[id]
 * Update a specific brief by ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { brief } = body as { brief: Brief };

    if (!brief) {
      return NextResponse.json({ error: 'Brief required' }, { status: 400 });
    }

    // Validate the ID matches
    if (brief.id !== params.id) {
      return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });
    }

    // Get user ID from session
    const userId = (session.user as any).id || session.user.email;

    // Validate the brief userId matches the authenticated user
    if (brief.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized: userId mismatch' }, { status: 403 });
    }

    // Use authenticated client for RLS
    const accessToken = (session as any).accessToken;
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    // Upsert the brief
    const savedBrief = await upsertBrief(supabase, brief);

    return NextResponse.json({ brief: savedBrief }, { status: 200 });
  } catch (error) {
    console.error('Error updating brief:', error);
    
    // Handle version conflicts specifically
    if ((error as any)?.status === 409) {
      return NextResponse.json(
        { error: 'version_conflict' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
