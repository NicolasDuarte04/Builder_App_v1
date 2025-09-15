/**
 * Assistant context utilities for building system prompt context from Brief data
 */

// Re-export the buildAssistantContext function from briefPromptBuilder
// This centralizes the context logic in a dedicated assistant module
export { buildAssistantContext } from '@/lib/briefPromptBuilder';

// Export types for convenience
export type { Brief } from '@/types/brief';
