import { v4 as uuidv4 } from 'uuid';
import { Roadmap, RoadmapPhase, Task, Tool, Priority, Category } from '@/types/roadmap';

interface OpenAIStep {
  title: string;
  description: string;
  dependencies: number[];
  estimatedTime: number;
  priority: Priority;
  category: Category;
}

export function transformOpenAIResponse(response: string, projectTitle: string = 'New Project'): Roadmap {
  try {
    const steps = JSON.parse(response) as OpenAIStep[];
    
    // Transform steps into phases with tasks and tools
    const phases: RoadmapPhase[] = steps.map((step, index) => {
      // Split the description into tasks if it contains bullet points
      const tasks: Task[] = step.description
        .split(/\n-|\n•/)
        .filter(Boolean)
        .map(task => ({
          id: uuidv4(),
          title: task.trim(),
          description: task.trim(),
          isCompleted: false,
        }));

      // Determine recommended tools based on the category
      const tools: Tool[] = getRecommendedTools(step.category);

      return {
        id: uuidv4(),
        title: step.title,
        description: step.description,
        priority: step.priority,
        category: step.category,
        estimatedTime: step.estimatedTime,
        dependencies: step.dependencies.map(d => d.toString()),
        tasks,
        tools,
        isExpanded: true,
      };
    });

    return {
      id: uuidv4(),
      title: projectTitle,
      description: `Generated roadmap for ${projectTitle}`,
      phases,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error transforming OpenAI response:', error);
    throw new Error('Failed to transform roadmap data');
  }
}

function getRecommendedTools(category: Category): Tool[] {
  const toolsByCategory: Record<Category, Tool[]> = {
    setup: [
      { name: 'GitHub', url: 'https://github.com', category: 'development' },
      { name: 'VS Code', url: 'https://code.visualstudio.com', category: 'development' },
    ],
    development: [
      { name: 'Next.js', url: 'https://nextjs.org', category: 'development' },
      { name: 'TypeScript', url: 'https://typescriptlang.org', category: 'development' },
    ],
    testing: [
      { name: 'Jest', url: 'https://jestjs.io', category: 'testing' },
      { name: 'Cypress', url: 'https://cypress.io', category: 'testing' },
    ],
    deployment: [
      { name: 'Vercel', url: 'https://vercel.com', category: 'deployment' },
      { name: 'Docker', url: 'https://docker.com', category: 'deployment' },
    ],
    maintenance: [
      { name: 'Sentry', url: 'https://sentry.io', category: 'other' },
      { name: 'DataDog', url: 'https://datadoghq.com', category: 'other' },
    ],
  };

  return toolsByCategory[category] || [];
} 