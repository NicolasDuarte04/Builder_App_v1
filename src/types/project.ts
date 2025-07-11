export type ProjectComplexity = 'simple' | 'medium' | 'complex';

export interface Project {
  id: string;
  title: string;
  description: string;
  complexity?: ProjectComplexity;
  createdAt: Date;
  updatedAt: Date;
  roadmap: RoadmapNode[];
}

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  tools?: Tool[];
  children?: RoadmapNode[];
  isCompleted?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  icon?: string;
} 