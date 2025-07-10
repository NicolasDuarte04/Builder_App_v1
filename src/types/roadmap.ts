export type Priority = 'high' | 'medium' | 'low';
export type Category = 'setup' | 'development' | 'testing' | 'deployment' | 'maintenance';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'need-help';

// Tool reference that maps to Briki's tool database
export interface ToolReference {
  toolId: string;        // Reference to tool in Briki's database
  context?: string;      // Optional context for tool usage
  requiredFeatures?: string[]; // Features needed from the tool
}

// Action types
export type ActionType = 
  | 'launch-feature'
  | 'show-component'
  | 'trigger-agent'
  | 'open-tool'
  | 'mark-complete'
  | 'request-help'
  | 'custom';

export interface TaskAction {
  type: ActionType;
  payload: Record<string, unknown>;
  conditions?: {
    requiredStatus?: TaskStatus[];
    requiredTools?: string[];
    customCheck?: string;
  };
}

// Base task interface with common properties
interface BaseTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  estimatedTime?: number;
  assignee?: string;
  tools?: ToolReference[];
  actions?: TaskAction[];
  metadata?: Record<string, unknown>;
}

// Subtask extends base task
export interface Subtask extends BaseTask {
  parentId: string;
  order: number;
  dependencies?: string[]; // IDs of other subtasks this depends on
}

// Main task that can contain subtasks
export interface Task extends BaseTask {
  subtasks: Subtask[];
  isExpanded?: boolean;
  completionCriteria?: {
    requiredSubtasks?: string[];
    percentageRequired?: number;
    customCriteria?: string;
  };
}

// Phase that contains tasks
export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  estimatedTime: number;
  dependencies: string[];
  tasks: Task[];
  tools: ToolReference[];
  isExpanded?: boolean;
  status: TaskStatus;
  metadata?: Record<string, unknown>;
}

// Complete roadmap structure
export interface Roadmap {
  id: string;
  title: string;
  description: string;
  phases: RoadmapPhase[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// Component Props Interfaces
export interface RoadmapCardProps {
  phase: RoadmapPhase;
  onToggleExpand?: (id: string) => void;
  className?: string;
}

export interface TaskListProps {
  tasks: Task[];
  onTaskComplete?: (taskId: string) => void;
  className?: string;
}

export interface SubtaskCardProps {
  subtask: Subtask;
  onStatusChange: (subtaskId: string, status: TaskStatus) => void;
  onActionTrigger: (subtaskId: string, action: TaskAction) => void;
  className?: string;
}

export interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export interface ToolBlockProps {
  tools: ToolReference[];
  className?: string;
}

export interface RoadmapGridProps {
  phases: RoadmapPhase[];
  className?: string;
} 