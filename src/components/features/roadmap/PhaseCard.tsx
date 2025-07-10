"use client";

import { RoadmapPhase } from '@/types/roadmap';
import { useRoadmapStore } from '@/store/useRoadmapStore';
import { Handle, Position } from 'reactflow';
import { CardContainer, CardBody, CardItem } from '@/components/ui/3d-card';
import { cn } from '@/lib/utils';
import { getPriorityBadgeClass, getPriorityGradientClass } from '@/lib/styles';
import { TaskChecklist } from './TaskChecklist';
import { ToolIconsRow } from './ToolIconsRow';

interface PhaseCardProps {
  data: RoadmapPhase;
  isConnectable?: boolean;
  selected?: boolean;
}

export function PhaseCard({ data, isConnectable = true, selected = false }: PhaseCardProps) {
  const togglePhaseExpand = useRoadmapStore(state => state.togglePhaseExpand);
  const toggleTaskComplete = useRoadmapStore(state => state.toggleTaskComplete);

  // Handle card expansion
  const handleExpand = () => {
    togglePhaseExpand(data.id);
  };

  // Handle task completion
  const handleTaskComplete = (taskId: string) => {
    toggleTaskComplete(data.id, taskId);
  };

  return (
    <div className="relative group">
      {/* React Flow Handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-neutral-400 dark:!bg-neutral-600"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bg-neutral-400 dark:!bg-neutral-600"
      />

      {/* 3D Card Container */}
      <CardContainer
        containerClassName="py-4"
        className={cn(
          "w-[320px] min-h-[200px]",
          selected && "ring-2 ring-blue-500"
        )}
        onClick={handleExpand}
      >
        <CardBody 
          className={cn(
            "relative h-auto w-full border rounded-xl p-4 transition-all duration-200",
            "border-neutral-200 dark:border-neutral-800",
            "bg-white dark:bg-zinc-900",
            getPriorityGradientClass(data.priority)
          )}
        >
          {/* Priority Badge */}
          <CardItem
            translateZ={20}
            className="absolute top-4 right-4"
          >
            <span className={getPriorityBadgeClass(data.priority)}>
              {data.priority}
            </span>
          </CardItem>

          {/* Title */}
          <CardItem
            translateZ={30}
            as="h3"
            className="text-lg font-semibold mb-2 pr-24" // Space for badge
          >
            {data.title}
          </CardItem>

          {/* Description */}
          <CardItem
            as="p"
            translateZ={20}
            className="text-neutral-600 dark:text-neutral-400 text-sm mb-4"
          >
            {data.description}
          </CardItem>

          {/* Metadata */}
          <CardItem
            translateZ={20}
            className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400"
          >
            <span>{data.estimatedTime}h</span>
            <span>{data.category}</span>
          </CardItem>

          {/* Expandable Content */}
          {data.isExpanded && (
            <div className="mt-6 space-y-6">
              {/* Tasks Section */}
              {data.tasks.length > 0 && (
                <TaskChecklist
                  tasks={data.tasks}
                  onTaskComplete={handleTaskComplete}
                />
              )}

              {/* Tools Section */}
              {data.tools.length > 0 && (
                <ToolIconsRow tools={data.tools} />
              )}
            </div>
          )}
        </CardBody>
      </CardContainer>
    </div>
  );
} 