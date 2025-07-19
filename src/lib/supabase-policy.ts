import { supabase } from './supabase';

export interface PolicyUpload {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  upload_time: string;
  extracted_text: string;
  ai_summary: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error_message?: string;
}

export interface CreatePolicyUploadData {
  user_id: string;
  file_name: string;
  file_path: string;
  extracted_text: string;
  ai_summary?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error_message?: string;
}

export async function createPolicyUpload(data: CreatePolicyUploadData): Promise<PolicyUpload | null> {
  try {
    
    const { data: upload, error } = await supabase
      .from('policy_uploads')
      .insert({
        user_id: data.user_id,
        file_name: data.file_name,
        file_path: data.file_path,
        upload_time: new Date().toISOString(),
        extracted_text: data.extracted_text,
        ai_summary: data.ai_summary || null,
        status: data.status,
        error_message: data.error_message || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating policy upload:', error);
      return null;
    }

    return upload;
  } catch (error) {
    console.error('Error creating policy upload:', error);
    return null;
  }
}

export async function updatePolicyUpload(
  id: string, 
  updates: Partial<Omit<PolicyUpload, 'id' | 'user_id' | 'file_name' | 'file_path' | 'upload_time'>>
): Promise<PolicyUpload | null> {
  try {
    
    const { data: upload, error } = await supabase
      .from('policy_uploads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating policy upload:', error);
      return null;
    }

    return upload;
  } catch (error) {
    console.error('Error updating policy upload:', error);
    return null;
  }
}

export async function getPolicyUploadsByUser(userId: string): Promise<PolicyUpload[]> {
  try {
    const { data: uploads, error } = await supabase
      .from('policy_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('upload_time', { ascending: false });

    if (error) {
      console.error('Error fetching policy uploads:', error);
      return [];
    }

    return uploads || [];
  } catch (error) {
    console.error('Error fetching policy uploads:', error);
    return [];
  }
}

export async function getPolicyUploadById(id: string): Promise<PolicyUpload | null> {
  try {
    const { data: upload, error } = await supabase
      .from('policy_uploads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching policy upload:', error);
      return null;
    }

    return upload;
  } catch (error) {
    console.error('Error fetching policy upload:', error);
    return null;
  }
}

export async function deletePolicyUpload(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('policy_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting policy upload:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting policy upload:', error);
    return false;
  }
} 