"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { ProjectCreationInput } from './project/ProjectCreationInput';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { AuroraBackground } from '../ui/aurora-background';
import { generateTestProject } from '@/lib/test-utils';
import { Loader2, Settings, ChevronDown } from 'lucide-react';

// Dynamically import RoadmapFlow to avoid SSR issues with ReactFlow
const RoadmapFlow = dynamic(
  () => import('./roadmap/RoadmapFlow').catch(err => {
    console.error('Failed to load RoadmapFlow:', err);
    return () => (
      <div className="h-[600px] flex items-center justify-center text-red-500">
        Error loading roadmap visualization. Please refresh the page.
      </div>
    );
  }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    ),
  }
);

export function RoadmapView() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const isGenerating = useProjectStore((state) => state.isGenerating);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const { t } = useTranslation();
  const [showDevTools, setShowDevTools] = useState(false);

  // Only show in development
  const isDev = process.env.NODE_ENV === 'development';

  const handleGenerateTestRoadmap = (complexity: 'simple' | 'medium' | 'complex') => {
    const testProject = generateTestProject(complexity);
    setCurrentProject(testProject);
    setShowDevTools(false);
  };

  return (
    <section className="w-full relative">
      {/* Dev Tools Dropdown - Only in Development */}
      {isDev && (
        <div className="fixed top-20 right-4 z-50">
          <div className="relative">
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-sm hover:bg-neutral-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Dev Tools
              <ChevronDown className={`w-4 h-4 transition-transform ${showDevTools ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showDevTools && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 p-2 bg-neutral-800 rounded-lg shadow-xl border border-neutral-700"
                >
                  <div className="space-y-1">
                    <button
                      onClick={() => handleGenerateTestRoadmap('simple')}
                      className="block w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 rounded transition-colors"
                    >
                      Test Simple (5 nodes)
                    </button>
                    <button
                      onClick={() => handleGenerateTestRoadmap('medium')}
                      className="block w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 rounded transition-colors"
                    >
                      Test Medium (15 nodes)
                    </button>
                    <button
                      onClick={() => handleGenerateTestRoadmap('complex')}
                      className="block w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 rounded transition-colors"
                    >
                      Test Complex (30 nodes)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AuroraBackground className="min-h-[calc(100vh-4rem)] !bg-transparent">
        <div className="w-full">
          <ProjectCreationInput />
          
          {currentProject && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <RoadmapFlow />
            </motion.div>
          )}
        </div>
      </AuroraBackground>
    </section>
  );
} 