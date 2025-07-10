import { Edge, Node, MarkerType } from 'reactflow';
import { RoadmapPhase } from '@/types/roadmap';

// Default edge style for phase connections
export const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#94a3b8',
  },
  style: {
    strokeWidth: 2,
    stroke: '#94a3b8',
  },
};

// Convert phases to React Flow nodes
export function phasesToNodes(phases: RoadmapPhase[]): Node[] {
  return phases.map((phase, index) => ({
    id: phase.id,
    type: 'phaseNode', // Custom node type for PhaseCard
    position: calculateNodePosition(index, phases.length),
    data: phase,
  }));
}

// Create edges based on phase dependencies
export function createPhaseEdges(phases: RoadmapPhase[]): Edge[] {
  const edges: Edge[] = [];
  
  phases.forEach(phase => {
    phase.dependencies.forEach(dependencyId => {
      edges.push({
        id: `${dependencyId}-${phase.id}`,
        source: dependencyId,
        target: phase.id,
        ...defaultEdgeOptions,
      });
    });
  });

  return edges;
}

// Calculate initial node positions in a grid layout
function calculateNodePosition(index: number, totalNodes: number) {
  const GRID_SPACING = 300;
  const NODES_PER_ROW = Math.ceil(Math.sqrt(totalNodes));
  
  const row = Math.floor(index / NODES_PER_ROW);
  const col = index % NODES_PER_ROW;
  
  return {
    x: col * GRID_SPACING,
    y: row * GRID_SPACING,
  };
} 