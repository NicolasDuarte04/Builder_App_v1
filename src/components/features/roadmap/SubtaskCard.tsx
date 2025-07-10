"use client";

import { Subtask, TaskAction, TaskStatus } from '@/types/roadmap';
import { CardItem } from '@/components/ui/3d-card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IconCircleDot, 
  IconCircleCheck, 
  IconCircleX, 
  IconAlertCircle,
  IconPlayerPlay,
  IconChevronRight
} from '@tabler/icons-react';

interface SubtaskCardProps {
  subtask: Subtask;
  onStatusChange: (subtaskId: string, status: TaskStatus) => void;
  onActionTrigger: (subtaskId: string, action: TaskAction) => void;
  className?: string;
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  'pending': <IconCircleDot className="w-5 h-5 text-neutral-400" />,
  'in-progress': <IconPlayerPlay className="w-5 h-5 text-blue-500" />,
  'completed': <IconCircleCheck className="w-5 h-5 text-green-500" />,
  'failed': <IconCircleX className="w-5 h-5 text-red-500" />,
  'need-help': <IconAlertCircle className="w-5 h-5 text-yellow-500" />
};

const statusColors: Record<TaskStatus, string> = {
  'pending': 'bg-neutral-100 dark:bg-neutral-800',
  'in-progress': 'bg-blue-50 dark:bg-blue-900/20',
  'completed': 'bg-green-50 dark:bg-green-900/20',
  'failed': 'bg-red-50 dark:bg-red-900/20',
  'need-help': 'bg-yellow-50 dark:bg-yellow-900/20'
};

export function SubtaskCard({ subtask, onStatusChange, onActionTrigger, className }: SubtaskCardProps) {
  const handleStatusClick = () => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      'pending': 'in-progress',
      'in-progress': 'completed',
      'completed': 'pending',
      'failed': 'in-progress',
      'need-help': 'in-progress'
    };
    onStatusChange(subtask.id, nextStatus[subtask.status]);
  };

  const handleActionClick = (action: TaskAction) => {
    // Check if action conditions are met
    if (!action.conditions) {
      onActionTrigger(subtask.id, action);
      return;
    }

    const { requiredStatus, requiredTools } = action.conditions;
    const statusMet = !requiredStatus || requiredStatus.includes(subtask.status);
    const toolsMet = !requiredTools || (subtask.tools?.some(t => requiredTools.includes(t.toolId)) ?? false);

    if (statusMet && toolsMet) {
      onActionTrigger(subtask.id, action);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        "group relative flex items-start gap-4 p-3 rounded-lg transition-colors",
        statusColors[subtask.status],
        className
      )}
    >
      {/* Status Icon */}
      <button
        onClick={handleStatusClick}
        className="flex-shrink-0 mt-1 hover:scale-110 transition-transform"
      >
        {statusIcons[subtask.status]}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm">{subtask.title}</h4>
          {subtask.estimatedTime && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              ~{subtask.estimatedTime}h
            </span>
          )}
        </div>

        {subtask.description && subtask.description !== subtask.title && (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {subtask.description}
          </p>
        )}

        {/* Tools */}
        {subtask.tools && subtask.tools.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {subtask.tools.map(tool => (
              <span
                key={tool.toolId}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs
                  bg-white dark:bg-zinc-800
                  border border-neutral-200 dark:border-neutral-700"
              >
                {tool.toolId}
                {tool.context && (
                  <span className="ml-1 text-neutral-400">({tool.context})</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {subtask.actions && subtask.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {subtask.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full",
                  "bg-white dark:bg-zinc-800",
                  "border border-neutral-200 dark:border-neutral-700",
                  "hover:bg-neutral-50 dark:hover:bg-zinc-700",
                  "transition-colors duration-200"
                )}
              >
                {action.type}
                <IconChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
} 