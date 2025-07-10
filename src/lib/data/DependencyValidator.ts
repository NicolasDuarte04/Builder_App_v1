import { RoadmapPhase } from '@/types/roadmap';

/**
 * Validates that all dependencies in a roadmap refer to existing phases
 * @param phases Array of roadmap phases to validate
 * @returns boolean indicating if all dependencies are valid
 */
export function validateDependencies(phases: RoadmapPhase[]): boolean {
  // Extract all phase IDs for lookup
  const ids = new Set(phases.map(p => p.id));
  
  // Check that every phase's dependencies exist in the IDs set
  return phases.every(phase =>
    phase.dependencies?.every(dep => ids.has(dep)) ?? true
  );
}

/**
 * Checks for circular dependencies in the roadmap phases
 * @param phases Array of roadmap phases to check
 * @returns boolean indicating if any circular dependencies were found
 */
export function hasCircularDependencies(phases: RoadmapPhase[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(phaseId: string): boolean {
    if (recursionStack.has(phaseId)) return true;
    if (visited.has(phaseId)) return false;

    visited.add(phaseId);
    recursionStack.add(phaseId);

    const phase = phases.find(p => p.id === phaseId);
    if (phase?.dependencies) {
      for (const depId of phase.dependencies) {
        if (hasCycle(depId)) return true;
      }
    }

    recursionStack.delete(phaseId);
    return false;
  }

  return phases.some(phase => hasCycle(phase.id));
} 