
"use client";

import { useTools } from '@/hooks/useTools';
import { TOOL_CATEGORIES, ToolCategory } from '@/lib/supabase';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/Badge';
import { textStyles } from '@/lib/styles';
import { cn } from '@/lib/utils';

export function ToolsList() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | undefined>();
  const { tools, isLoading, error, voteForTool } = useTools({
    category: selectedCategory,
    orderBy: 'votes',
    orderDirection: 'desc'
  });

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
        Error loading tools: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(undefined)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors
            ${!selectedCategory 
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 text-opacity-100'
            }`}
        >
          All
        </button>
        {TOOL_CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors
              ${selectedCategory === category
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 text-opacity-100'
              }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-neutral-100 dark:bg-neutral-800 rounded-lg h-48 animate-pulse"
              />
            ))
          ) : (
            // Tool cards
            tools.map(tool => (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium">{tool.name}</h3>
                  <button
                    onClick={() => voteForTool(tool.id)}
                    className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-neutral-100 text-opacity-100"
                  >
                    <span>▲</span>
                    <span>{tool.votes}</span>
                  </button>
                </div>
                
                <p className="text-sm mb-3 text-neutral-600 dark:text-neutral-200">
                  {tool.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {tool.category && (
                    <Badge label={tool.category} variant="neutral" />
                  )}
                  {tool.website_url && (
                    <a
                      href={tool.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                    >
                      Visit →
                    </a>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 