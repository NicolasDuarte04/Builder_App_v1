import { Project, RoadmapNode, Tool } from '@/types/project';
import { v4 as uuidv4 } from 'uuid';

// Sample tools for testing
const sampleTools: Tool[] = [
  { id: '1', name: 'React', description: 'UI Library', url: 'https://react.dev', category: 'Frontend' },
  { id: '2', name: 'Next.js', description: 'React Framework', url: 'https://nextjs.org', category: 'Frontend' },
  { id: '3', name: 'TypeScript', description: 'Type-safe JavaScript', url: 'https://typescriptlang.org', category: 'Language' },
  { id: '4', name: 'Tailwind CSS', description: 'Utility-first CSS', url: 'https://tailwindcss.com', category: 'Styling' },
  { id: '5', name: 'Node.js', description: 'JavaScript Runtime', url: 'https://nodejs.org', category: 'Backend' },
];

export function generateTestRoadmap(nodeCount: number = 10, depth: number = 3): RoadmapNode[] {
  const generateNode = (level: number, parentIndex: number = 0): RoadmapNode => {
    const nodeId = uuidv4();
    const node: RoadmapNode = {
      id: nodeId,
      title: `Phase ${level}-${parentIndex}: ${getRandomPhaseTitle()}`,
      description: `This is a detailed description for phase ${level}-${parentIndex}. It contains important information about what needs to be done in this phase of the project development process.`,
      tools: getRandomTools(),
      isCompleted: Math.random() > 0.7,
    };

    if (level < depth) {
      const childCount = Math.floor(Math.random() * 3) + 1; // 1-3 children
      node.children = Array.from({ length: childCount }, (_, i) => 
        generateNode(level + 1, i)
      );
    }

    return node;
  };

  // Generate root nodes
  const rootNodes: RoadmapNode[] = [];
  const rootCount = Math.min(nodeCount, 5); // Max 5 root nodes
  
  for (let i = 0; i < rootCount; i++) {
    rootNodes.push(generateNode(1, i));
  }

  return rootNodes;
}

function getRandomPhaseTitle(): string {
  const titles = [
    'Project Setup',
    'Design System',
    'Core Features',
    'API Integration',
    'Testing Suite',
    'Performance Optimization',
    'Security Implementation',
    'Documentation',
    'Deployment Pipeline',
    'Monitoring Setup',
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function getRandomTools(): Tool[] {
  const count = Math.floor(Math.random() * 4) + 1; // 1-4 tools
  const shuffled = [...sampleTools].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function generateTestProject(complexity: 'simple' | 'medium' | 'complex' = 'medium'): Project {
  const nodeConfigs = {
    simple: { count: 5, depth: 2 },
    medium: { count: 15, depth: 3 },
    complex: { count: 30, depth: 4 },
  };

  const config = nodeConfigs[complexity];
  
  return {
    id: uuidv4(),
    title: `Test Project - ${complexity}`,
    description: `A ${complexity} test project for performance testing with ${config.count} nodes`,
    complexity,
    createdAt: new Date(),
    updatedAt: new Date(),
    roadmap: generateTestRoadmap(config.count, config.depth),
  };
} 