import { Project, RoadmapNode } from './project';
import { Message } from 'ai';

export type ChatMode = 'smart' | 'builder';

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
  
  // New Chat State
  chatMode: ChatMode;
  chatHistory: Message[];
  
  // New Chat Actions
  setChatMode: (mode: ChatMode) => void;
  setChatHistory: (history: Message[]) => void;
  addMessage: (message: Message) => void;
  clearChatHistory: () => void;
} 