import { Edge, Node, MarkerType, Position } from 'reactflow';
import dagre from 'dagre';

// Default edge style for connections
export const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: '#a1a1aa', // zinc-400
  },
  style: {
    strokeWidth: 1.5,
    stroke: '#a1a1aa', // zinc-400
    strokeDasharray: '4 4',
  },
};

// Node dimensions for layout calculation
const nodeWidth = 180;
const nodeHeight = 100;

/**
 * Apply Dagre layout to nodes and edges
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  // Guard clause for empty or invalid input
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    console.warn('[getLayoutedElements] No nodes provided');
    return { nodes: [], edges: [] };
  }

  try {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Configure the layout for a more compact, clear flow
    dagreGraph.setGraph({ 
      rankdir: direction,
      nodesep: 50,      // Horizontal space between nodes
      ranksep: 70,      // Vertical space between ranks
      marginx: 20,
      marginy: 20,
    });

    // Add nodes to Dagre
    nodes.forEach((node) => {
      if (!node || !node.id) {
        console.warn('[getLayoutedElements] Invalid node:', node);
        return;
      }
      dagreGraph.setNode(node.id, { 
        width: nodeWidth,
        height: nodeHeight 
      });
    });

    // Add edges to Dagre (only if we have valid nodes)
    if (edges && Array.isArray(edges)) {
      edges.forEach((edge) => {
        if (!edge || !edge.source || !edge.target) {
          console.warn('[getLayoutedElements] Invalid edge:', edge);
          return;
        }
        // Only add edge if both source and target nodes exist
        if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
          dagreGraph.setEdge(edge.source, edge.target);
        }
      });
    }

    // Calculate the layout
    dagre.layout(dagreGraph);

    // Apply the calculated positions to nodes
    const layoutedNodes = nodes.map((node) => {
      if (!node || !node.id || !dagreGraph.hasNode(node.id)) {
        return node; // Return unchanged if invalid
      }

      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) {
        console.warn(`[getLayoutedElements] No position calculated for node: ${node.id}`);
        return node; // Return unchanged if no position
      }
      
      // Dagre gives us the center position, we need to calculate top-left
      const position = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      };

      return {
        ...node,
        position,
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      };
    });

    // Return layouted elements
    return {
      nodes: layoutedNodes,
      edges: edges?.map(edge => ({
        ...edge,
        ...defaultEdgeOptions,
      })) || [],
    };
  } catch (error) {
    console.error('[getLayoutedElements] Error calculating layout:', error);
    return { nodes, edges: edges || [] }; // Return original nodes if layout fails
  }
} 