import { ToolReference } from '@/types/roadmap';

// Tool categories in Briki's system
export type ToolCategory =
  | 'development'
  | 'design'
  | 'testing'
  | 'deployment'
  | 'documentation'
  | 'communication'
  | 'analytics'
  | 'ai'
  | 'other';

// Tool information from Briki's database
export interface BrikiTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon?: string;
  url: string;
  features: string[];
  integrations: string[];
  metadata?: Record<string, unknown>;
}

// Context for tool usage
export interface ToolContext {
  phase: string;
  task?: string;
  purpose: string;
  requiredFeatures: string[];
}

// Tool mapping rules
interface ToolMappingRule {
  pattern: RegExp;
  toolId: string;
  context: (match: string) => Partial<ToolContext>;
  requiredFeatures: string[];
}

// Example tool mapping rules
const toolMappingRules: ToolMappingRule[] = [
  {
    pattern: /github|git|version(-|\s)?control/i,
    toolId: 'github',
    context: (match) => ({
      purpose: 'Version control and code collaboration',
      requiredFeatures: ['repository', 'pull-requests']
    }),
    requiredFeatures: ['repository', 'pull-requests']
  },
  {
    pattern: /figma|design|ui\/ux/i,
    toolId: 'figma',
    context: (match) => ({
      purpose: 'UI/UX design and prototyping',
      requiredFeatures: ['design', 'prototyping']
    }),
    requiredFeatures: ['design', 'prototyping']
  },
  // Add more rules as needed
];

// Map a tool reference to Briki's tool system
export function mapToolReference(
  toolId: string,
  context: Partial<ToolContext> = {}
): ToolReference {
  // Find matching rule
  const rule = toolMappingRules.find(r => r.pattern.test(toolId));

  if (rule) {
    const ruleContext = rule.context(toolId);
    return {
      toolId: rule.toolId,
      context: context.purpose || ruleContext.purpose || '',
      requiredFeatures: [
        ...new Set([
          ...(context.requiredFeatures || []),
          ...(rule.requiredFeatures || [])
        ])
      ]
    };
  }

  // Default mapping if no rule matches
  return {
    toolId,
    context: context.purpose || '',
    requiredFeatures: context.requiredFeatures || []
  };
}

// Get tool information from Briki's database
export async function getToolInfo(toolId: string): Promise<BrikiTool | null> {
  try {
    // TODO: Replace with actual API call to Briki's tool database
    const mockTools: Record<string, BrikiTool> = {
      github: {
        id: 'github',
        name: 'GitHub',
        description: 'Version control and collaboration platform',
        category: 'development',
        icon: '/tools/github.svg',
        url: 'https://github.com',
        features: ['repository', 'pull-requests', 'actions', 'issues'],
        integrations: ['vscode', 'slack']
      },
      figma: {
        id: 'figma',
        name: 'Figma',
        description: 'Collaborative design platform',
        category: 'design',
        icon: '/tools/figma.svg',
        url: 'https://figma.com',
        features: ['design', 'prototyping', 'collaboration'],
        integrations: ['sketch', 'zeplin']
      }
    };

    return mockTools[toolId] || null;
  } catch (error) {
    console.error('Error fetching tool info:', error);
    return null;
  }
}

// Check if a tool has required features
export function hasRequiredFeatures(
  tool: BrikiTool,
  requiredFeatures: string[]
): boolean {
  return requiredFeatures.every(feature => 
    tool.features.includes(feature)
  );
}

// Get recommended tools for a context
export async function getRecommendedTools(
  context: Partial<ToolContext>
): Promise<ToolReference[]> {
  try {
    // TODO: Replace with actual API call to get recommendations
    const recommendations: ToolReference[] = [];
    
    // Example logic for recommendations
    if (context.phase?.toLowerCase().includes('design')) {
      recommendations.push(mapToolReference('figma', {
        purpose: 'UI/UX design for ' + context.phase,
        requiredFeatures: ['design', 'prototyping']
      }));
    }

    if (context.task?.toLowerCase().includes('code') || 
        context.task?.toLowerCase().includes('develop')) {
      recommendations.push(mapToolReference('github', {
        purpose: 'Code management for ' + context.task,
        requiredFeatures: ['repository']
      }));
    }

    return recommendations;
  } catch (error) {
    console.error('Error getting tool recommendations:', error);
    return [];
  }
} 