"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';

interface RoadmapNodeData {
  title: string;
  description: string;
  isCompleted?: boolean;
  tools?: { name: string; url: string }[];
}

const RoadmapNode = memo(({ data, isConnectable }: NodeProps<RoadmapNodeData>) => {
  const { title, description, isCompleted, tools = [] } = data;

  return (
    <div className="relative group">
      <GlowingEffect 
        disabled={false}
        glow={isCompleted}
        variant={isCompleted ? "default" : "white"}
        blur={15}
        spread={25}
      />
      <div className={cn(
        "relative z-10 w-[280px] rounded-xl border p-4 backdrop-blur-sm transition-all",
        "bg-white/50 dark:bg-black/50",
        "border-neutral-200 dark:border-neutral-800",
        isCompleted && "border-green-500/50 dark:border-green-500/50",
        "hover:shadow-lg"
      )}>
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="!bg-neutral-400 dark:!bg-neutral-600"
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            {isCompleted && (
              <span className="text-green-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>
          
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>

          {tools.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Recommended Tools:
              </p>
              <div className="flex flex-wrap gap-1">
                {tools.map((tool) => (
                  <a
                    key={tool.name}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 
                             text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 
                             dark:hover:bg-neutral-700 transition-colors"
                  >
                    {tool.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="!bg-neutral-400 dark:!bg-neutral-600"
        />
      </div>
    </div>
  );
});

RoadmapNode.displayName = 'RoadmapNode';

export default RoadmapNode; 