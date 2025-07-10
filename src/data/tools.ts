export interface Tool {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  icon?: string;
}

export const tools: Tool[] = [
  {
    id: 'notion',
    name: 'Notion',
    url: 'https://notion.so',
    category: 'documentation',
    description: 'All-in-one workspace for notes, docs, and project management',
    icon: '/images/tools/notion.svg'
  },
  {
    id: 'figma',
    name: 'Figma',
    url: 'https://figma.com',
    category: 'design',
    description: 'Collaborative interface design tool',
    icon: '/images/tools/figma.svg'
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    category: 'development',
    description: 'Code hosting and collaboration platform',
    icon: '/images/tools/github.svg'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    url: 'https://vercel.com',
    category: 'deployment',
    description: 'Frontend deployment and hosting platform',
    icon: '/images/tools/vercel.svg'
  },
  // Add more tools as needed
]; 