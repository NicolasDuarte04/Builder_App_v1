import { Roadmap, RoadmapPhase, Task, TaskStatus, ToolReference } from '@/types/roadmap';

interface OpenAITask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  tools: string[];
  metadata: {
    complexity: 'low' | 'medium' | 'high';
    requiredSkills: string[];
    [key: string]: any;
  };
}

interface OpenAIPhase {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'setup' | 'development' | 'testing' | 'deployment' | 'maintenance';
  estimatedTime: number;
  dependencies: string[];
  tasks: OpenAITask[];
  tools: string[];
  status: TaskStatus;
  metadata: {
    complexity: 'low' | 'medium' | 'high';
    order: number;
    [key: string]: any;
  };
}

interface OpenAIResponse {
  phases: OpenAIPhase[];
  title?: string;
  description?: string;
}

// Map tool IDs to our tool reference system
function mapToolReferences(toolIds: string[]): ToolReference[] {
  return toolIds.map(id => ({
    toolId: id,
    context: '', // Will be populated by tool mapping system
    requiredFeatures: [] // Will be populated by tool mapping system
  }));
}

// Convert a task with defaults
function transformTask(task: OpenAITask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status || 'pending',
    priority: task.priority,
    estimatedTime: task.estimatedTime || 1,
    tools: mapToolReferences(task.tools || []),
    subtasks: [], // Will be populated by subtask generator
    isExpanded: false,
    completionCriteria: {
      percentageRequired: 100 // All subtasks must be complete by default
    },
    metadata: {
      ...task.metadata,
      complexity: task.metadata?.complexity || 'low',
      requiredSkills: task.metadata?.requiredSkills || []
    }
  };
}

// Convert a phase with defaults
function transformPhase(phase: OpenAIPhase, index: number): RoadmapPhase {
  return {
    id: phase.id,
    title: phase.title,
    description: phase.description,
    priority: phase.priority,
    category: phase.category,
    estimatedTime: phase.estimatedTime,
    dependencies: phase.dependencies || [],
    tasks: phase.tasks.map(task => transformTask(task)),
    tools: mapToolReferences(phase.tools || []),
    isExpanded: index === 0, // First phase expanded by default
    status: phase.status || 'pending',
    metadata: {
      ...phase.metadata,
      complexity: phase.metadata?.complexity || 'low',
      order: phase.metadata?.order ?? index
    }
  };
}

// Main transformer function
export function transformOpenAIResponse(
  response: string,
  projectTitle: string = 'New Project'
): Roadmap {
  try {
    // Parse the OpenAI response
    const parsedResponse = JSON.parse(response) as OpenAIResponse;
    
    // Transform phases
    const phases = parsedResponse.phases.map((phase, index) => 
      transformPhase(phase, index)
    );

    // Create the roadmap
    const roadmap: Roadmap = {
      id: `roadmap-${Date.now()}`,
      title: parsedResponse.title || projectTitle,
      description: parsedResponse.description || `Generated roadmap for ${projectTitle}`,
      phases,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        source: 'openai',
        version: '1.0',
        generatedAt: new Date().toISOString(),
        totalPhases: phases.length,
        totalTasks: phases.reduce((acc, phase) => acc + phase.tasks.length, 0)
      }
    };

    return roadmap;
  } catch (error) {
    console.error('Error transforming OpenAI response:', error);
    throw new Error('Failed to transform roadmap data');
  }
}

// Validate the roadmap structure
export function validateRoadmap(roadmap: Roadmap): boolean {
  try {
    // Check required fields
    if (!roadmap.id || !roadmap.title || !Array.isArray(roadmap.phases)) {
      return false;
    }

    // Validate each phase
    return roadmap.phases.every(phase => {
      // Check required phase fields
      if (!phase.id || !phase.title || !Array.isArray(phase.tasks)) {
        return false;
      }

      // Validate phase ID format
      if (!/^phase-\d+$/.test(phase.id)) {
        return false;
      }

      // Validate tasks
      return phase.tasks.every(task => {
        // Check required task fields
        if (!task.id || !task.title) {
          return false;
        }

        // Validate task ID format
        if (!new RegExp(`^task-\\d+-\\d+$`).test(task.id)) {
          return false;
        }

        // Validate subtasks if they exist
        if (task.subtasks && task.subtasks.length > 0) {
          return task.subtasks.every(subtask => 
            subtask.id && subtask.title && subtask.parentId === task.id
          );
        }

        return true;
      });
    });
  } catch (error) {
    console.error('Error validating roadmap:', error);
    return false;
  }
} 