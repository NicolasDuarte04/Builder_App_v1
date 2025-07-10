import { Priority } from '@/types/roadmap';
import { cn } from '@/lib/utils';

export const priorityStyles: Record<Priority, {
  badge: string;
  gradient: string;
  border: string;
}> = {
  high: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    gradient: 'from-red-50 to-transparent dark:from-red-900/10',
    border: 'border-red-200 dark:border-red-800',
  },
  medium: {
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    gradient: 'from-yellow-50 to-transparent dark:from-yellow-900/10',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  low: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    gradient: 'from-green-50 to-transparent dark:from-green-900/10',
    border: 'border-green-200 dark:border-green-800',
  },
};

export function getPriorityStyles(priority: Priority) {
  return priorityStyles[priority];
}

// Helper function to get badge classes
export function getPriorityBadgeClass(priority: Priority, className?: string) {
  return cn(
    'px-2 py-1 text-sm rounded-full',
    priorityStyles[priority].badge,
    className
  );
}

// Helper function to get gradient background
export function getPriorityGradientClass(priority: Priority, className?: string) {
  return cn(
    'bg-gradient-to-b',
    priorityStyles[priority].gradient,
    className
  );
} 