import { Project, RoadmapNode } from './project';

// Generation Flow Types
export enum GenerationState {
  AWAITING_USER_INPUT = 'AWAITING_USER_INPUT',
  ASKING_FOR_DETAILS = 'ASKING_FOR_DETAILS',
  CONFIRMING_DETAILS = 'CONFIRMING_DETAILS',
  READY_TO_GENERATE = 'READY_TO_GENERATE',
  GENERATING = 'GENERATING',
  DISPLAYING = 'DISPLAYING'
}

export interface GenerationFlowData {
  initialPrompt?: string;
  projectName?: string | null;
  projectDescription?: string | null;
  // Track what we're still waiting for
  needsName?: boolean;
  needsDescription?: boolean;
}

export interface ProjectStore {
  // Project State
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Project Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  setCurrentProject: (project: Project | null) => void;

  // Roadmap Actions
  updateRoadmapNode: (projectId: string, nodeId: string, updates: Partial<RoadmapNode>) => void;
  addRoadmapNode: (projectId: string, parentNodeId: string | null, node: RoadmapNode) => void;
  deleteRoadmapNode: (projectId: string, nodeId: string) => void;

  // UI State
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  
  // Generation Flow State
  generationState: GenerationState;
  generationFlowData: GenerationFlowData;
  
  // Generation Flow Actions
  setGenerationState: (state: GenerationState) => void;
  setGenerationFlowData: (data: Partial<GenerationFlowData>) => void;
  resetGenerationFlow: () => void;
} 