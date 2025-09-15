import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { getBriefBySession } from '@/lib/supabase/briefs';
import { getSessionIdFromCookies } from '@/lib/chat/session-prefs-server';
import { Brief } from '@/types/brief';

/**
 * Server-side helper to get the current user's brief from session
 * Returns null if not authenticated or no brief found
 */
export async function getCurrentBrief(): Promise<Brief | null> {
  try {
    // Get session and sessionId
    const [session, sessionId] = await Promise.all([
      getServerSession(authOptions),
      getSessionIdFromCookies()
    ]);

    // If no auth session or sessionId, return null (guest mode)
    if (!session?.user?.email || !sessionId) {
      return null;
    }

    // Get user ID from session
    const userId = (session.user as any).id || session.user.email;

    // Use authenticated client for RLS
    const accessToken = (session as any).accessToken;
    const supabase = createAuthenticatedSupabaseClient(accessToken);
    
    // Get the latest brief for this user and session
    const brief = await getBriefBySession(supabase, userId, sessionId);

    // Verify the brief belongs to the authenticated user
    if (brief && brief.userId !== userId) {
      console.warn('Brief userId mismatch, ignoring');
      return null;
    }

    return brief;
  } catch (error) {
    console.error('Error getting current brief:', error);
    return null;
  }
}
