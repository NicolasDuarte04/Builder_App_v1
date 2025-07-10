"use client";

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import RoadmapNode from './RoadmapNode';
import { useProjectStore } from '@/store/useProjectStore';
import { RoadmapNode as RoadmapNodeType } from '@/types/project';

const nodeTypes = {
  roadmapNode: RoadmapNode,
};

const edgeOptions = {
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8',
  },
  style: {
    stroke: '#94a3b8',
  },
};

export default function RoadmapFlow() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateRoadmapNode = useProjectStore((state) => state.updateRoadmapNode);

  const initialNodes: Node[] = useMemo(() => {
    if (!currentProject) return [];
    
    const convertToNodes = (node: RoadmapNodeType, position = { x: 0, y: 0 }, level = 0): Node[] => {
      const nodes: Node[] = [];
      const spacing = { x: 320, y: 200 };
      
      // Add current node
      nodes.push({
        id: node.id,
        type: 'roadmapNode',
        position,
        data: {
          title: node.title,
          description: node.description,
          isCompleted: node.isCompleted,
          tools: node.tools,
        },
      });

      // Add child nodes
      if (node.children) {
        const childCount = node.children.length;
        const startX = position.x - ((childCount - 1) * spacing.x) / 2;
        
        node.children.forEach((child, index) => {
          const childPosition = {
            x: startX + index * spacing.x,
            y: position.y + spacing.y,
          };
          
          nodes.push(...convertToNodes(child, childPosition, level + 1));
        });
      }

      return nodes;
    };

    return currentProject.roadmap.flatMap((node, index) => 
      convertToNodes(node, { x: index * 320, y: 0 })
    );
  }, [currentProject]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!currentProject) return [];
    
    const createEdges = (node: RoadmapNodeType): Edge[] => {
      const edges: Edge[] = [];
      
      if (node.children) {
        node.children.forEach(child => {
          edges.push({
            id: `${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            ...edgeOptions,
          });
          edges.push(...createEdges(child));
        });
      }
      
      return edges;
    };

    return currentProject.roadmap.flatMap(node => createEdges(node));
  }, [currentProject]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...edgeOptions }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!currentProject) return;
      
      const updatedNodes = nodes.map((n) => {
        if (n.id === node.id) {
          const newData = { ...n.data, isCompleted: !n.data.isCompleted };
          updateRoadmapNode(currentProject.id, n.id, { isCompleted: newData.isCompleted });
          return { ...n, data: newData };
        }
        return n;
      });
      
      setNodes(updatedNodes);
    },
    [nodes, setNodes, currentProject, updateRoadmapNode]
  );

  if (!currentProject) {
    return (
      <div className="h-[600px] flex items-center justify-center text-neutral-500">
        Select or create a project to view its roadmap
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
} 