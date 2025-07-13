"use client";

import { Project } from '@/types/project';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { textStyles } from '@/lib/styles';
import { cn } from '@/lib/utils';

interface ProjectLibraryProps {
  projects?: Project[];
}

export function ProjectLibrary({ projects = [] }: ProjectLibraryProps) {
  // If no projects, show empty state
  if (projects.length === 0) {
    return (
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-8 text-center">
        <p className="text-neutral-600 dark:text-neutral-200">
          No projects yet. Create your first project above!
        </p>
      </div>
    );
  }

  return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <motion.div
              key={project.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group relative bg-white dark:bg-zinc-900 rounded-lg shadow-sm hover:shadow-md transition-all border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden"
            >
          {/* Project Complexity Badge */}
          {project.complexity && (
            <div className="absolute top-4 right-4">
              <Badge label={project.complexity} variant="default" />
            </div>
          )}

          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {project.title}
            </h3>
            <p className="text-sm mb-4 line-clamp-2 text-neutral-600 dark:text-neutral-200">
              {project.description}
            </p>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-200">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <button className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                View Roadmap
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ 
                width: `${(project.roadmap.filter(node => node.isCompleted).length / project.roadmap.length) * 100}%` 
              }}
            />
          </div>
        </motion.div>
          ))}
        </div>
  );
} 