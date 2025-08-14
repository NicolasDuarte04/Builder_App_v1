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

export async function getPolicyUploadsByUser(_userId?: string): Promise<PolicyUpload[]> {
  return [];
}

export async function deletePolicyUpload(_id: string): Promise<boolean> {
  return true;
}