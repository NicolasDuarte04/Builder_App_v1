import { supabase } from './supabase';

export interface SavedRoadmap {
  id: string;
  user_id: string;
  title: string;
  description: string;
  roadmap_data: any;
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  id: string;
  roadmap_id: string;
  phase_id: string;
  task_id: string;
  status: 'pending' | 'completed';
  completed_at?: string;
}

// Save a new roadmap
export async function saveRoadmap(
  userId: string,
  roadmapData: any
): Promise<{ data: SavedRoadmap | null; error: any }> {
  const { data, error } = await supabase
    .from('roadmaps')
    .insert({
      user_id: userId,
      title: roadmapData.title,
      description: roadmapData.description,
      roadmap_data: roadmapData,
    })
    .select()
    .single();

  return { data, error };
}

// Update roadmap title
export async function updateRoadmapTitle(
  roadmapId: string,
  newTitle: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('roadmaps')
    .update({ 
      title: newTitle,
      updated_at: new Date().toISOString()
    })
    .eq('id', roadmapId);

  return { error };
}

// Update phase title in roadmap data
export async function updatePhaseTitle(
  roadmapId: string,
  phaseId: string,
  newTitle: string
): Promise<{ error: any }> {
  // First get the current roadmap data
  const { data: roadmap, error: fetchError } = await supabase
    .from('roadmaps')
    .select('roadmap_data')
    .eq('id', roadmapId)
    .single();

  if (fetchError) return { error: fetchError };

  // Update the phase title
  const updatedData = { ...roadmap.roadmap_data };
  const phaseIndex = updatedData.phases.findIndex((p: any) => p.id === phaseId);
  
  if (phaseIndex !== -1) {
    updatedData.phases[phaseIndex].title = newTitle;
  }

  // Save the updated data
  const { error } = await supabase
    .from('roadmaps')
    .update({ 
      roadmap_data: updatedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', roadmapId);

  return { error };
}

// Toggle task status
export async function toggleTaskStatus(
  roadmapId: string,
  phaseId: string,
  taskId: string,
  currentStatus: 'pending' | 'completed'
): Promise<{ error: any }> {
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  
  // Check if task status record exists
  const { data: existing } = await supabase
    .from('task_status')
    .select('id')
    .eq('roadmap_id', roadmapId)
    .eq('phase_id', phaseId)
    .eq('task_id', taskId)
    .single();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('task_status')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', existing.id);

    return { error };
  } else {
    // Create new record
    const { error } = await supabase
      .from('task_status')
      .insert({
        roadmap_id: roadmapId,
        phase_id: phaseId,
        task_id: taskId,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      });

    return { error };
  }
}

// Get all task statuses for a roadmap
export async function getTaskStatuses(
  roadmapId: string
): Promise<{ data: TaskStatus[] | null; error: any }> {
  const { data, error } = await supabase
    .from('task_status')
    .select('*')
    .eq('roadmap_id', roadmapId);

  return { data, error };
}

// Get user's roadmaps
export async function getUserRoadmaps(
  userId: string
): Promise<{ data: SavedRoadmap[] | null; error: any }> {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

// Get a single roadmap with task statuses
export async function getRoadmapWithStatuses(
  roadmapId: string
): Promise<{ data: { roadmap: SavedRoadmap; statuses: TaskStatus[] } | null; error: any }> {
  const { data: roadmap, error: roadmapError } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('id', roadmapId)
    .single();

  if (roadmapError) return { data: null, error: roadmapError };

  const { data: statuses, error: statusError } = await supabase
    .from('task_status')
    .select('*')
    .eq('roadmap_id', roadmapId);

  if (statusError) return { data: null, error: statusError };

  return { data: { roadmap, statuses: statuses || [] }, error: null };
} 