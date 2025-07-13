"use client";

import { useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MilestoneNode } from './MilestoneNode';
import { useProjectStore } from '@/store/useProjectStore';
import { convertRoadmapToSimplifiedFlow } from '@/lib/roadmap-transformer';
import { getLayoutedElements } from '@/lib/flow-utils';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const nodeTypes = {
  milestoneNode: MilestoneNode,
};

// Loading message component
const LoadingMessage = ({ message }: { message: string }) => (
  <div className="h-[400px] flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-200 gap-3 text-opacity-100">
    <Loader2 className="w-6 h-6 animate-spin" />
    <p>{message}</p>
  </div>
);

interface RoadmapFlowInnerProps {
  onNodeClick: (phaseId: string) => void;
}

function RoadmapFlowInner({ onNodeClick }: RoadmapFlowInnerProps) {
  const currentProject = useProjectStore((state) => state.currentProject);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Diagnostic logging for currentProject
  useEffect(() => {
    console.log('[RoadmapFlow] currentProject:', currentProject);
  }, [currentProject]);

  // Memoize the conversion and layout calculation
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    console.log('[RoadmapFlow] Starting flow conversion...');
    
    if (!currentProject?.roadmap) {
      console.log('[RoadmapFlow] No roadmap data available');
      return { nodes: [], edges: [] };
    }
    
    try {
      // 1. Convert roadmap to a simplified flow structure
      console.log('[RoadmapFlow] Converting to simplified flow...');
      const { nodes, edges } = convertRoadmapToSimplifiedFlow(currentProject.roadmap);
      console.log('[RoadmapFlow] Simplified flow result:', { nodes, edges });
      
      if (!nodes || nodes.length === 0) {
        console.warn('[RoadmapFlow] No nodes generated from conversion');
        return { nodes: [], edges: [] };
      }
      
      // 2. Apply Dagre layout to get node positions
      console.log('[RoadmapFlow] Applying layout...');
      const result = getLayoutedElements(nodes, edges);
      console.log('[RoadmapFlow] Layout complete:', result);
      
      return result;
    } catch (error) {
      console.error('[RoadmapFlow] Error in flow conversion:', error);
      setError('Failed to process roadmap data');
      return { nodes: [], edges: [] };
    }
  }, [currentProject]);

  // Set the nodes and edges for React Flow
  useEffect(() => {
    const initializeFlow = async () => {
      try {
        console.log('[RoadmapFlow] Initializing flow with:', { layoutedNodes, layoutedEdges });
        
        if (!layoutedNodes || !Array.isArray(layoutedNodes)) {
          throw new Error('Invalid nodes data');
        }

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        
        // Fit view after layout is calculated
        if (layoutedNodes.length > 0) {
          setTimeout(() => {
            console.log('[RoadmapFlow] Fitting view...');
            fitView({ padding: 0.2, duration: 600 });
          }, 100);
        }
      } catch (error) {
        console.error('[RoadmapFlow] Error initializing flow:', error);
        setError('Failed to initialize roadmap view');
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    initializeFlow();
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView]);

  // Error state
  if (error) {
    return (
      <div className="h-[400px] flex items-center justify-center text-red-500 dark:text-red-400 text-opacity-100">
        <p>{error}</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingMessage message="Rendering roadmap... this may take a few seconds." />;
  }

  // No data state
  if (!currentProject || !nodes || nodes.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-neutral-500 dark:text-neutral-200 text-opacity-100">
        No roadmap to display.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-[400px] w-full bg-neutral-50 dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(event, node) => onNodeClick(node.id)}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
      >
        <Background 
          gap={20} 
          size={1} 
          className="bg-neutral-50 dark:bg-black" 
        />
        <Controls 
          showInteractive={false} 
          className="!bg-white dark:!bg-neutral-900 !border-neutral-200 dark:!border-neutral-800 !shadow-sm" 
        />
        <MiniMap 
          nodeColor="#009BFF" 
          className="!bg-white dark:!bg-neutral-900 !border-neutral-200 dark:!border-neutral-800 !shadow-sm" 
        />
      </ReactFlow>
    </motion.div>
  );
}

export default function RoadmapFlow({ onNodeClick }: RoadmapFlowInnerProps) {
  return (
    <ReactFlowProvider>
      <RoadmapFlowInner onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  );
} 