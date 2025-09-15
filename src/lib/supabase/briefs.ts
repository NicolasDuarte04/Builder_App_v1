import { SupabaseClient } from '@supabase/supabase-js';
import { Brief } from '@/types/brief';

/**
 * Upsert a brief - insert or update if exists
 * Persists the entire Brief in briefs.data (canonical), including version
 * Implements optimistic concurrency control via version checking
 */
export async function upsertBrief(
  client: SupabaseClient,
  brief: Brief
): Promise<Brief> {
  try {
    // Check for version conflicts before upsert if brief has an ID
    if (brief.id) {
      const { data: existingRow, error: selectError } = await client
        .from('briefs')
        .select("data->>'version'")
        .eq('id', brief.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing brief version: ${selectError.message}`);
      }

      // If row exists, check version conflict
      if (existingRow && !selectError) {
        const versionValue = (existingRow as any)["data->>'version'"];
        const serverVersion = Number(versionValue) || 0;
        const clientVersion = brief.version ?? 0;
        
        if (serverVersion !== clientVersion) {
          const versionError = new Error('Version conflict');
          throw Object.assign(versionError, { status: 409 });
        }
      }
    }

    const { data, error } = await client
      .from('briefs')
      .upsert(
        {
          id: brief.id,
          user_id: brief.userId,
          session_id: brief.sessionId,
          locale: brief.locale,
          data: brief,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert brief: ${error.message}`);
    }

    // Return the brief data from the JSONB column
    return data.data as Brief;
  } catch (error) {
    // Never log PII - only log error type
    console.error('Brief upsert error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Get a brief by its ID
 * Returns the brief data from the JSONB column
 */
export async function getBriefById(
  client: SupabaseClient,
  id: string
): Promise<Brief | null> {
  try {
    const { data, error } = await client
      .from('briefs')
      .select('data')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw new Error(`Failed to get brief by ID: ${error.message}`);
    }

    return data?.data as Brief || null;
  } catch (error) {
    // Never log PII - only log error type
    console.error('Brief fetch error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Get the most recent brief for a user session
 * Filters by user_id + session_id, orders by updated_at desc, limit 1
 */
export async function getBriefBySession(
  client: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<Brief | null> {
  try {
    const { data, error } = await client
      .from('briefs')
      .select('data')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - this is expected for new sessions
        return null;
      }
      throw new Error(`Failed to get brief by session: ${error.message}`);
    }

    return data?.data as Brief || null;
  } catch (error) {
    // Never log PII - only log error type
    console.error('Brief fetch error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
