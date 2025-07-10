"use client";

import { useState } from 'react';
import { BrikiInput } from '@/components/chat/BrikiInput';
import { useTranslation } from '@/hooks/useTranslation';

export function ProjectCreationInput() {
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const placeholders = [
    t('project.creation.placeholders.habit_app'),
    t('project.creation.placeholders.ecommerce'),
    t('project.creation.placeholders.dashboard'),
  ];

  const handleSubmit = async (prompt: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate roadmap');
      }

      const data = await response.json();
      const parsed = JSON.parse(data.roadmap ?? '{}');
      // Fix: API returns 'phases' not 'steps'
      const phases = Array.isArray(parsed.phases) ? parsed.phases : [];
      setRoadmap(phases);
    } catch (err) {
      console.error('Error generating roadmap:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate roadmap. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-16 py-12 space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-center">
          {t('project.creation.title')}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-center max-w-xl mx-auto">
          {t('project.creation.description')}
        </p>
      </div>

      <BrikiInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholders={placeholders}
        className="w-full"
      />
      
      {error && (
        <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
          {error}
        </div>
      )}

      {roadmap && (
        <div className="space-y-4 mt-8">
          <h3 className="text-xl font-medium">
            {t('project.creation.roadmap.title')}
          </h3>
          {roadmap.map((phase: any, index: number) => (
            <div
              key={phase.id || index}
              className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{phase.title}</h3>
                <span className={`px-2 py-1 text-sm rounded ${
                  phase.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                  phase.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                }`}>
                  {phase.priority}
                </span>
              </div>
              <p className="mt-2 text-neutral-600 dark:text-neutral-300">
                {phase.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {phase.estimatedTime}h
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {phase.category}
                </span>
                {phase.dependencies && phase.dependencies.length > 0 && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Depends on: {phase.dependencies.join(', ')}
                  </span>
                )}
              </div>
              
              {/* Display tasks within each phase */}
              {phase.tasks && phase.tasks.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tasks:</h4>
                  {phase.tasks.map((task: any) => (
                    <div key={task.id} className="ml-4 p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{task.title}</span>
                        <span className="text-xs text-neutral-500">{task.estimatedTime}h</span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 