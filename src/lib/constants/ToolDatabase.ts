/**
 * Mock database for AI tool recommendations and capabilities mapping
 */

export type ToolCategory = 'design' | 'development' | 'marketing' | 'automation' | 'analytics';
export type ToolCapability = 'prototyping' | 'API integration' | 'SEO' | 'A/B testing' | 'payment processing';
export type ToolName = 'Figma' | 'Stripe' | 'Google Analytics' | 'Zapier';

export interface ToolIntegration {
  [key: string]: (ToolCategory | ToolCapability)[];
}

export const ToolDatabase = {
  categories: ['design', 'development', 'marketing', 'automation', 'analytics'] as ToolCategory[],
  capabilities: ['prototyping', 'API integration', 'SEO', 'A/B testing', 'payment processing'] as ToolCapability[],
  integrations: {
    'Figma': ['design', 'prototyping'],
    'Stripe': ['payment processing'],
    'Google Analytics': ['analytics'],
    'Zapier': ['automation']
  } as ToolIntegration
}; 