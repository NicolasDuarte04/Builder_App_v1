import { create } from 'zustand';
import { Roadmap, RoadmapPhase, Task } from '@/types/roadmap';

interface RoadmapState {
  roadmap: Roadmap | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setRoadmap: (roadmap: Roadmap) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Phase actions
  togglePhaseExpand: (phaseId: string) => void;
  updatePhase: (phaseId: string, updates: Partial<RoadmapPhase>) => void;
  
  // Task actions
  toggleTaskComplete: (phaseId: string, taskId: string) => void;
  updateTask: (phaseId: string, taskId: string, updates: Partial<Task>) => void;
}

export const useRoadmapStore = create<RoadmapState>((set) => ({
  roadmap: null,
  isLoading: false,
  error: null,

  setRoadmap: (roadmap) => set({ roadmap }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  togglePhaseExpand: (phaseId) =>
    set((state) => {
      if (!state.roadmap) return state;

      return {
        roadmap: {
          ...state.roadmap,
          phases: state.roadmap.phases.map((phase) =>
            phase.id === phaseId
              ? { ...phase, isExpanded: !phase.isExpanded }
              : phase
          ),
        },
      };
    }),

  updatePhase: (phaseId, updates) =>
    set((state) => {
      if (!state.roadmap) return state;

      return {
        roadmap: {
          ...state.roadmap,
          phases: state.roadmap.phases.map((phase) =>
            phase.id === phaseId ? { ...phase, ...updates } : phase
          ),
        },
      };
    }),

  toggleTaskComplete: (phaseId, taskId) =>
    set((state) => {
      if (!state.roadmap) return state;

      return {
        roadmap: {
          ...state.roadmap,
          phases: state.roadmap.phases.map((phase) =>
            phase.id === phaseId
              ? {
                  ...phase,
                  tasks: phase.tasks.map((task) =>
                    task.id === taskId
                      ? { ...task, isCompleted: !task.isCompleted }
                      : task
                  ),
                }
              : phase
          ),
        },
      };
    }),

  updateTask: (phaseId, taskId, updates) =>
    set((state) => {
      if (!state.roadmap) return state;

      return {
        roadmap: {
          ...state.roadmap,
          phases: state.roadmap.phases.map((phase) =>
            phase.id === phaseId
              ? {
                  ...phase,
                  tasks: phase.tasks.map((task) =>
                    task.id === taskId ? { ...task, ...updates } : task
                  ),
                }
              : phase
          ),
        },
      };
    }),
})); 