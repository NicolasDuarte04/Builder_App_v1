"use client";

import { Tool } from '@/types/roadmap';
import { CardItem } from '@/components/ui/3d-card';
import { cn } from '@/lib/utils';

interface ToolIconsRowProps {
  tools: Tool[];
  className?: string;
}

export function ToolIconsRow({ tools, className }: ToolIconsRowProps) {
  return (
    <CardItem
      translateZ={20}
      className={cn("mt-4 flex flex-wrap gap-2", className)}
    >
      {tools.map((tool) => (
        <a
          key={tool.name}
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full",
            "bg-neutral-100 dark:bg-neutral-800",
            "hover:bg-neutral-200 dark:hover:bg-neutral-700",
            "transition-colors duration-200",
            "flex items-center gap-1.5"
          )}
        >
          {tool.icon && (
            <img 
              src={tool.icon} 
              alt={tool.name}
              className="w-4 h-4 rounded-sm"
            />
          )}
          {tool.name}
        </a>
      ))}
    </CardItem>
  );
} 