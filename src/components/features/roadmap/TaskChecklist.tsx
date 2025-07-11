"use client";

import { Task } from '@/types/roadmap';
import { CardItem } from '@/components/ui/3d-card';
import { cn } from '@/lib/utils';

interface TaskChecklistProps {
  tasks: Task[];
  onTaskComplete?: (taskId: string) => void;
  className?: string;
}

export function TaskChecklist({ tasks, onTaskComplete, className }: TaskChecklistProps) {
  return (
    <CardItem
      translateZ={20}
      className={cn("mt-4 space-y-2", className)}
    >
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className="group flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 p-2 rounded-lg transition-colors"
        >
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={() => onTaskComplete?.(task.id)}
            className="mt-1 rounded border-neutral-300 dark:border-neutral-700 
              text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400
              cursor-pointer"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">{task.title}</p>
            {task.description && task.description !== task.title && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {task.description}
              </p>
            )}
            {task.estimatedTime && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 inline-block">
                ~{task.estimatedTime}h
              </span>
            )}
          </div>
        </div>
      ))}
    </CardItem>
  );
} 