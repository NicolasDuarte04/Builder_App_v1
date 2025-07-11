"use client";

import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

interface RoadmapNodeData {
  title: string;
  description: string;
  isCompleted?: boolean;
  tools?: { name: string; url: string }[];
  forceExpanded?: boolean;
}

const RoadmapNode = memo(({ data, isConnectable }: NodeProps<RoadmapNodeData>) => {
  const { title, description, isCompleted, tools = [], forceExpanded } = data;
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync with forceExpanded prop
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  return (
    <div className="relative group">
      <GlowingEffect 
        disabled={false}
        glow={isCompleted}
        variant={isCompleted ? "default" : "white"}
        blur={15}
        spread={25}
      />
      <div 
        className={cn(
          "relative z-10 w-[280px] rounded-xl border p-4 backdrop-blur-sm transition-all cursor-pointer",
          "bg-white/50 dark:bg-black/50",
          "border-neutral-200 dark:border-neutral-800",
          isCompleted && "border-green-500/50 dark:border-green-500/50",
          "hover:shadow-lg"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        data-expand-toggle
      >
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="!bg-neutral-400 dark:!bg-neutral-600"
        />
        
        <div className="space-y-2">
          {/* Header - Always visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-neutral-500 dark:text-neutral-400"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {title}
              </h3>
            </div>
            {isCompleted && (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            )}
          </div>
          
          {/* Expandable content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {/* Description */}
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {description}
                  </p>

                  {/* Tools */}
                  {tools.length > 0 && (
                    <div>
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
                            onClick={(e) => e.stopPropagation()}
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

                  {/* Placeholder for future tasks */}
                  {/* {tasks && tasks.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                        Tasks:
                      </p>
                      <div className="space-y-1">
                        {tasks.map((task, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input type="checkbox" className="w-3 h-3" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )} */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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