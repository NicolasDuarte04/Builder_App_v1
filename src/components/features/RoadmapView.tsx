"use client";

import dynamic from 'next/dynamic';
import { useProjectStore } from '@/store/useProjectStore';
import { ProjectCreationInput } from './project/ProjectCreationInput';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'motion/react';

// Dynamically import RoadmapFlow to avoid SSR issues with ReactFlow
const RoadmapFlow = dynamic(
  () => import('./roadmap/RoadmapFlow'),
  { ssr: false }
);

export function RoadmapView() {
  // Fix: Separate state selectors
  const currentProject = useProjectStore((state) => state.currentProject);
  const isGenerating = useProjectStore((state) => state.isGenerating);
  const { t } = useTranslation();

  return (
    <section className="pt-4 pb-12">
      <div className="container mx-auto px-4">
        {currentProject ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {currentProject.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">
                  {t('lastUpdated')}: {new Date(currentProject.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <RoadmapFlow />
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center max-w-3xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold mb-4 text-gradient"
              >
                {t('createRoadmapTitle')}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg text-neutral-600 dark:text-neutral-400"
              >
                {t('createRoadmapDescription')}
              </motion.p>
            </div>

            <div className="relative">
              {/* Decorative gradient blur behind input */}
              <div 
                className="absolute inset-0 -z-10 transform-gpu overflow-hidden blur-3xl"
                aria-hidden="true"
              >
                <div
                  className="relative aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20"
                  style={{
                    clipPath:
                      'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                  }}
                />
              </div>

              <ProjectCreationInput />
            </div>

            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center mt-8"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-neutral-100" />
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
} 