import { SupabaseClient } from '@supabase/supabase-js';
import { CaseFile } from '@/types/case';

/**
 * Create a new case from a brief
 * Initializes with 'active' status and empty timeline/reminders
 */
export async function createCaseFromBrief(
  client: SupabaseClient,
  userId: string,
  briefId: string
): Promise<CaseFile> {
  try {
    const caseId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newCase: CaseFile = {
      id: caseId,
      userId,
      caseId,
      briefId,
      status: 'active',
      timeline: [
        {
          at: now,
          event: 'case_created',
          meta: { briefId }
        }
      ],
      reminders: [],
      createdAt: now,
      updatedAt: now
    };

    const { data, error } = await client
      .from('cases')
      .insert({
        id: caseId,
        user_id: userId,
        brief_id: briefId,
        status: 'active',
        timeline: newCase.timeline,
        reminders: newCase.reminders
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create case: ${error.message}`);
    }

    return newCase;
  } catch (error) {
    // Never log PII - only log error type
    console.error('Case creation error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Get a case by its ID
 * Returns null if not found
 */
export async function getCaseById(
  client: SupabaseClient,
  caseId: string
): Promise<CaseFile | null> {
  try {
    const { data, error } = await client
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw new Error(`Failed to get case: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Transform database row to CaseFile interface
    const caseFile: CaseFile = {
      id: data.id,
      userId: data.user_id,
      caseId: data.id, // caseId is the same as id
      briefId: data.brief_id,
      status: data.status as CaseFile['status'],
      timeline: data.timeline || [],
      reminders: data.reminders || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    return caseFile;
  } catch (error) {
    // Never log PII - only log error type
    console.error('Case fetch error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
