"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
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
import { Maximize2, Minimize2, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [allExpanded, setAllExpanded] = useState(false);
  const [renderTime, setRenderTime] = useState<number>(0);

  // Track render performance
  useEffect(() => {
    const startTime = performance.now();
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
    });
  }, [currentProject, allExpanded]);

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
      
      // Check if the click is on the expand/collapse area
      const target = event.target as HTMLElement;
      if (target.closest('[data-expand-toggle]')) {
        return; // Let the node handle its own expand/collapse
      }
      
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

  const toggleAllNodes = useCallback(() => {
    // This will trigger a re-render of all nodes with the new expanded state
    setAllExpanded(!allExpanded);
  }, [allExpanded]);

  if (!currentProject) {
    return (
      <div className="h-[600px] flex items-center justify-center text-neutral-500">
        Select or create a project to view its roadmap
      </div>
    );
  }

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="relative">
      {/* Toolbar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 z-10 flex gap-2"
      >
        <button
          onClick={toggleAllNodes}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-900 
                     border border-neutral-200 dark:border-neutral-800 rounded-lg
                     hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors
                     text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {allExpanded ? (
            <>
              <Minimize2 className="w-4 h-4" />
              Collapse All
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              Expand All
            </>
          )}
        </button>
      </motion.div>

      {/* Performance Stats - Only in Development */}
      {isDev && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 
                     bg-white dark:bg-neutral-900 border border-neutral-200 
                     dark:border-neutral-800 rounded-lg text-xs font-mono"
        >
          <Activity className="w-3 h-3" />
          <span className="text-neutral-600 dark:text-neutral-400">
            {nodes.length} nodes | {renderTime.toFixed(0)}ms
          </span>
        </motion.div>
      )}

      <div className="h-[600px] w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <ReactFlow
          nodes={nodes.map(node => ({
            ...node,
            data: { ...node.data, forceExpanded: allExpanded }
          }))}
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
    </div>
  );
} 