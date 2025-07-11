import { RoadmapNode, Tool } from '@/types/project';
import { v4 as uuidv4 } from 'uuid';
import { Node, Edge } from 'reactflow';

interface OpenAIPhase {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  estimatedTime: number;
  dependencies: string[];
  tasks: OpenAITask[];
  tools: string[];
  status: string;
  metadata: {
    complexity: string;
    order: number;
  };
}

interface OpenAITask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimatedTime: number;
  tools: string[];
  metadata: {
    complexity: string;
    requiredSkills: string[];
  };
}

/**
 * Convert a tool name string to a Tool object
 */
function createTool(toolName: string): Tool {
  // Map common tool names to their details
  const toolMappings: Record<string, Partial<Tool>> = {
    'github': { name: 'GitHub', url: 'https://github.com', category: 'development', description: 'Version control and collaboration platform' },
    'git': { name: 'Git', url: 'https://git-scm.com', category: 'development', description: 'Distributed version control system' },
    'vscode': { name: 'VS Code', url: 'https://code.visualstudio.com', category: 'development', description: 'Code editor' },
    'nextjs': { name: 'Next.js', url: 'https://nextjs.org', category: 'development', description: 'React framework' },
    'react': { name: 'React', url: 'https://react.dev', category: 'development', description: 'UI library' },
    'typescript': { name: 'TypeScript', url: 'https://typescriptlang.org', category: 'development', description: 'Typed JavaScript' },
    'tailwind': { name: 'Tailwind CSS', url: 'https://tailwindcss.com', category: 'styling', description: 'Utility-first CSS framework' },
    'vercel': { name: 'Vercel', url: 'https://vercel.com', category: 'deployment', description: 'Deployment platform' },
    'stripe': { name: 'Stripe', url: 'https://stripe.com', category: 'payment', description: 'Payment processing' },
    'supabase': { name: 'Supabase', url: 'https://supabase.com', category: 'backend', description: 'Backend as a service' },
    'firebase': { name: 'Firebase', url: 'https://firebase.google.com', category: 'backend', description: 'Backend platform' },
    'figma': { name: 'Figma', url: 'https://figma.com', category: 'design', description: 'Design tool' },
    'canva': { name: 'Canva', url: 'https://canva.com', category: 'design', description: 'Graphic design platform' },
    'mailchimp': { name: 'Mailchimp', url: 'https://mailchimp.com', category: 'marketing', description: 'Email marketing platform' },
    'google analytics': { name: 'Google Analytics', url: 'https://analytics.google.com', category: 'analytics', description: 'Web analytics' },
  };

  const normalizedName = toolName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const mapping = toolMappings[normalizedName];

  return {
    id: uuidv4(),
    name: mapping?.name || toolName,
    url: mapping?.url || '#',
    category: mapping?.category || 'other',
    description: mapping?.description || `Tool: ${toolName}`
  };
}

/**
 * Transform OpenAI phases to RoadmapNode structure
 */
export function transformOpenAIToRoadmap(phases: OpenAIPhase[]): RoadmapNode[] {
  return phases.map((phase) => {
    const roadmapNode: RoadmapNode = {
      id: phase.id || uuidv4(),
      title: phase.title,
      description: phase.description,
      tools: phase.tools.map(toolName => createTool(toolName)),
      isCompleted: false,
      children: phase.tasks.map((task) => ({
        id: task.id || uuidv4(),
        title: task.title,
        description: task.description,
        tools: task.tools.map(toolName => createTool(toolName)),
        isCompleted: false
      }))
    };

    return roadmapNode;
  });
}

/**
 * Convert hierarchical roadmap structure to React Flow nodes and edges
 */
export function convertRoadmapToFlow(roadmap: RoadmapNode[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Process each phase
  roadmap.forEach((phase, phaseIndex) => {
    // Create phase node
    nodes.push({
      id: phase.id,
      type: 'phaseNode',
      position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
      data: {
        title: phase.title,
        description: phase.description,
        tools: phase.tools,
        isCompleted: phase.isCompleted,
        phaseIndex,
        category: getPhaseCategory(phase.title), // Determine category from title
        isExpanded: phaseIndex === 0 // Only first phase expanded by default
      }
    });
    
    // Process tasks within the phase
    if (phase.children) {
      phase.children.forEach((task, taskIndex) => {
        // Create task node
        nodes.push({
          id: task.id,
          type: 'taskNode',
          position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
          data: {
            title: task.title,
            description: task.description,
            tools: task.tools,
            isCompleted: task.isCompleted,
            taskIndex,
            phaseId: phase.id
          }
        });
        
        // Create edge from phase to task
        edges.push({
          id: `edge-${phase.id}-${task.id}`,
          source: phase.id,
          target: task.id,
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: 2,
            stroke: '#94a3b8' // slate-400
          }
        });
      });
    }
  });
  
  return { nodes, edges };
}

/**
 * Determine phase category based on title keywords
 */
function getPhaseCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('research') || lowerTitle.includes('planning') || lowerTitle.includes('analysis')) {
    return 'planning';
  } else if (lowerTitle.includes('design') || lowerTitle.includes('prototype') || lowerTitle.includes('wireframe')) {
    return 'design';
  } else if (lowerTitle.includes('develop') || lowerTitle.includes('build') || lowerTitle.includes('implement')) {
    return 'development';
  } else if (lowerTitle.includes('test') || lowerTitle.includes('qa') || lowerTitle.includes('quality')) {
    return 'testing';
  } else if (lowerTitle.includes('launch') || lowerTitle.includes('deploy') || lowerTitle.includes('release')) {
    return 'deployment';
  } else if (lowerTitle.includes('market') || lowerTitle.includes('promote') || lowerTitle.includes('advertis')) {
    return 'marketing';
  } else if (lowerTitle.includes('operation') || lowerTitle.includes('maintain') || lowerTitle.includes('scale')) {
    return 'operations';
  }
  
  return 'general';
}

/**
 * Convert hierarchical roadmap structure to a simplified list of milestone nodes
 */
export function convertRoadmapToSimplifiedFlow(roadmap: RoadmapNode[]): { nodes: Node[]; edges: Edge[] } {
  // Guard clause for empty or invalid input
  if (!roadmap || !Array.isArray(roadmap) || roadmap.length === 0) {
    console.warn('[convertRoadmapToSimplifiedFlow] Invalid or empty roadmap input');
    return { nodes: [], edges: [] };
  }

  try {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create a node for each phase
    roadmap.forEach((phase, index) => {
      if (!phase || typeof phase !== 'object') {
        console.warn(`[convertRoadmapToSimplifiedFlow] Invalid phase at index ${index}`);
        return; // Skip invalid phase
      }

      // Determine the icon: use the first tool, or the category as a fallback
      const primaryTool = phase.tools?.[0]?.name?.toLowerCase() || getPhaseCategory(phase.title);
      
      nodes.push({
        id: phase.id || `phase-${index}`, // Fallback ID if missing
        type: 'milestoneNode',
        position: { x: 0, y: 0 }, // Position will be calculated by Dagre
        data: {
          label: phase.title || `Phase ${index + 1}`, // Fallback label if missing
          icon: primaryTool,
        },
      });

      // Create an edge to the next phase
      if (index > 0) {
        edges.push({
          id: `edge-${roadmap[index - 1].id}-${phase.id}`,
          source: roadmap[index - 1].id,
          target: phase.id,
          type: 'smoothstep',
          animated: true,
          style: {
            strokeWidth: 2,
            stroke: '#94a3b8', // slate-400
            strokeDasharray: '5, 5',
          },
        });
      }
    });

    // Ensure we have at least one node
    if (nodes.length === 0) {
      console.warn('[convertRoadmapToSimplifiedFlow] No valid nodes were created');
      return { nodes: [], edges: [] };
    }

    return { nodes, edges };
  } catch (error) {
    console.error('[convertRoadmapToSimplifiedFlow] Error transforming roadmap:', error);
    return { nodes: [], edges: [] };
  }
} 