import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PolicyUpload {
  id: string;
  user_id: string;
  file_name: string | null;
  storage_path: string | null;
  pdf_url: string | null;
  extraction_method?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Optional fields referenced by UI (PolicyHistory)
  upload_time?: string | null;
  status?: string | null;
  ai_summary?: string | null;
  error_message?: string | null;
}

export async function getPolicyUploadById(client: SupabaseClient, id: string) {
  return client.from('policy_uploads').select('*').eq('id', id).single();
}

export async function updatePolicyUpload(id: string, patch: Partial<PolicyUpload>) {
  return supabase.from('policy_uploads').update(patch).eq('id', id);
}

// --- Temporary no-op stubs for UI imports (do not call Supabase) ---
// These keep the chat app running when policy history is not used.

export async function getPolicyUploadsByUser(userId?: string): Promise<PolicyUpload[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('policy_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('upload_time', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[supabase-policy] getPolicyUploadsByUser error:', error);
      return [];
    }
    return data as PolicyUpload[];
  } catch (e) {
    console.error('[supabase-policy] getPolicyUploadsByUser exception:', e);
    return [];
  }
}

export async function deletePolicyUpload(id: string): Promise<boolean> {
  try {
    if (!id) return false;
    const { error } = await supabase
      .from('policy_uploads')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[supabase-policy] deletePolicyUpload error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[supabase-policy] deletePolicyUpload exception:', e);
    return false;
  }
}