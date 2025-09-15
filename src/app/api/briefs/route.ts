import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getBriefBySession, upsertBrief } from '@/lib/supabase/briefs';
import { Brief } from '@/types/brief';

export const runtime = 'nodejs';

/**
 * GET /api/briefs?sessionId=...&clientId=...
 * Retrieve the latest brief for the current user and session
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Guest mode: If no authenticated user, return 200 with auth:false
    if (!session?.user?.email) {
      return NextResponse.json({ brief: null, auth: false }, { status: 200 });
    }

    const sessionId = req.nextUrl.searchParams.get('sessionId');
    const clientId = req.nextUrl.searchParams.get('clientId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get user ID from session
    const userId = (session.user as any).id || session.user.email;

    // Use authenticated client for RLS
    const accessToken = (session as any).accessToken;
    const supabase = createAuthenticatedSupabaseClient(accessToken);
    
    // Get the latest brief for this user and session
    const brief = await getBriefBySession(supabase, userId, sessionId);

    if (!brief) {
      return NextResponse.json({ brief: null, auth: true }, { status: 200 });
    }

    // Verify the brief belongs to the authenticated user
    if (brief.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ brief, auth: true }, { status: 200 });
  } catch (error) {
    console.error('Error fetching brief:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/briefs
 * Create or update a brief
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { brief, clientId } = body as { brief: Brief; clientId?: string };

    if (!brief) {
      return NextResponse.json({ error: 'Brief required' }, { status: 400 });
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

    // If no clientId provided, resolve or create a session client
    let effectiveClientId = clientId;
    if (!effectiveClientId) {
      // Create a session-based client ID for this broker
      // In a real app, this might involve looking up or creating a client record
      effectiveClientId = `session-client-${brief.sessionId}`;
    }

    // Add clientId to the brief data
    const briefWithClient = {
      ...brief,
      clientId: effectiveClientId
    };

    // Upsert the brief
    const savedBrief = await upsertBrief(supabase, briefWithClient);

    return NextResponse.json({ brief: savedBrief }, { status: 200 });
  } catch (error) {
    console.error('Error saving brief:', error);
    
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
