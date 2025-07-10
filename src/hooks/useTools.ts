import { useState, useEffect } from 'react';
import { supabase, Tool, ToolCategory } from '@/lib/supabase';

interface UseToolsOptions {
  category?: ToolCategory;
  limit?: number;
  orderBy?: keyof Tool;
  orderDirection?: 'asc' | 'desc';
}

interface UseToolsReturn {
  tools: Tool[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  voteForTool: (toolId: string) => Promise<void>;
}

export function useTools({
  category,
  limit = 50,
  orderBy = 'votes',
  orderDirection = 'desc'
}: UseToolsOptions = {}): UseToolsReturn {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch tools from Supabase
  const fetchTools = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('tools')
        .select('*')
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .limit(limit);

      // Add category filter if specified
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw supabaseError;
      }

      setTools(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tools'));
    } finally {
      setIsLoading(false);
    }
  };

  // Vote for a tool
  const voteForTool = async (toolId: string) => {
    try {
      const { data: tool, error: fetchError } = await supabase
        .from('tools')
        .select('votes')
        .eq('id', toolId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('tools')
        .update({ votes: (tool?.votes || 0) + 1 })
        .eq('id', toolId);

      if (updateError) throw updateError;

      // Update local state
      setTools(currentTools =>
        currentTools.map(t =>
          t.id === toolId ? { ...t, votes: (t.votes || 0) + 1 } : t
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to vote for tool'));
    }
  };

  // Fetch tools on mount and when dependencies change
  useEffect(() => {
    fetchTools();
  }, [category, limit, orderBy, orderDirection]);

  return {
    tools,
    isLoading,
    error,
    refetch: fetchTools,
    voteForTool
  };
} 