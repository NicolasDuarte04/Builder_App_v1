import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Align with production table schema and what UI expects
export interface PolicyUpload {
  id: string;
  user_id: string;
  file_name: string | null;
  file_path: string | null;
  status: string | null;
  upload_time: string | null;
  ai_summary?: string | null;
  error_message?: string | null;
  // Optional newer fields (present if migrations were applied)
  storage_path?: string | null;
  pdf_url?: string | null;
  extraction_method?: string | null;
}

export async function getPolicyUploadsByUser(userId: string) {
  const { data, error } = await supabase
    .from('policy_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching policy uploads:', error);
    throw error;
  }
  return data || [];
}

export async function deletePolicyUpload(id: string) {
  const { error } = await supabase.from('policy_uploads').delete().eq('id', id);

  if (error) {
    console.error('Error deleting policy upload:', error);
    return false;
  }
  return true;
}

export async function getPolicyUploadById(client: SupabaseClient, id: string) {
  return client.from('policy_uploads').select('*').eq('id', id).single();
}

export async function updatePolicyUpload(id: string, patch: Partial<PolicyUpload>) {
  return supabase.from('policy_uploads').update(patch).eq('id', id);
}

export async function getPolicyUploadsByUser(userId: string): Promise<PolicyUpload[]> {
  const { data, error } = await supabase
    .from('policy_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('upload_time', { ascending: false });

  if (error) {
    console.error('[supabase-policy] getPolicyUploadsByUser error:', error);
    return [];
  }
  return data || [];
}

export async function deletePolicyUpload(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('policy_uploads')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[supabase-policy] deletePolicyUpload error:', error);
    return false;
  }
  return true;
}