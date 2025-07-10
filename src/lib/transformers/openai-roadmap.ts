import { v4 as uuidv4 } from 'uuid';
import { Roadmap, RoadmapPhase, Task, TaskStatus, ToolReference } from '@/types/roadmap';

interface OpenAIStep {
  title: string;
  description: string;
  dependencies: number[];
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  category: 'setup' | 'development' | 'testing' | 'deployment' | 'maintenance';
  tasks?: {
    title: string;
    description: string;
    estimatedTime?: number;
    tools?: string[];
  }[];
}

interface OpenAIResponse {
  steps: OpenAIStep[];
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

// Convert a single step to a phase
function stepToPhase(step: OpenAIStep, index: number): RoadmapPhase {
  // Convert tasks if they exist
  const tasks: Task[] = (step.tasks || []).map((task, taskIndex) => ({
    id: uuidv4(),
    title: task.title,
    description: task.description,
    status: 'pending' as TaskStatus,
    priority: step.priority,
    estimatedTime: task.estimatedTime || 1,
    tools: task.tools ? mapToolReferences(task.tools) : [],
    subtasks: [], // Will be populated by subtask generator
    isExpanded: false,
    actions: [] // Will be populated by action mapping system
  }));

  return {
    id: uuidv4(),
    title: step.title,
    description: step.description,
    priority: step.priority,
    category: step.category,
    estimatedTime: step.estimatedTime,
    dependencies: step.dependencies.map(d => d.toString()),
    tasks,
    tools: [], // Phase-level tools will be determined by tool mapping system
    isExpanded: index === 0, // First phase expanded by default
    status: 'pending' as TaskStatus,
    metadata: {
      order: index,
      originalDependencies: step.dependencies
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
    
    // Transform steps into phases
    const phases = parsedResponse.steps.map((step, index) => 
      stepToPhase(step, index)
    );

    // Create the roadmap
    const roadmap: Roadmap = {
      id: uuidv4(),
      title: parsedResponse.title || projectTitle,
      description: parsedResponse.description || `Generated roadmap for ${projectTitle}`,
      phases,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        source: 'openai',
        version: '1.0',
        generatedAt: new Date().toISOString()
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

      // Validate tasks
      return phase.tasks.every(task => {
        // Check required task fields
        if (!task.id || !task.title) {
          return false;
        }

        // Validate subtasks if they exist
        if (task.subtasks.length > 0) {
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