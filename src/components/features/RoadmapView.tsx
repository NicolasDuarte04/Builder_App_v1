"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { ProjectCreationInput } from './project/ProjectCreationInput';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { AuroraBackground } from '../ui/aurora-background';
import { generateTestProject } from '@/lib/test-utils';
import { Loader2, Settings, ChevronDown, AlertTriangle } from 'lucide-react';

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
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors shadow-lg"
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
                  className="absolute top-full right-0 mt-2 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg shadow-xl border border-orange-200 dark:border-orange-800"
                >
                  {/* Warning Label */}
                  <div className="flex items-center gap-2 mb-3 text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Development Mode - Hardcoded Test Data</span>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => handleGenerateTestRoadmap('simple')}
                      className="block w-full text-left px-3 py-2 text-sm text-orange-900 dark:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
                    >
                      <div className="font-medium">Test Simple (5 nodes)</div>
                      <div className="text-xs opacity-70">Quick performance test</div>
                    </button>
                    <button
                      onClick={() => handleGenerateTestRoadmap('medium')}
                      className="block w-full text-left px-3 py-2 text-sm text-orange-900 dark:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
                    >
                      <div className="font-medium">Test Medium (15 nodes)</div>
                      <div className="text-xs opacity-70">Standard complexity test</div>
                    </button>
                    <button
                      onClick={() => handleGenerateTestRoadmap('complex')}
                      className="block w-full text-left px-3 py-2 text-sm text-orange-900 dark:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
                    >
                      <div className="font-medium">Test Complex (30 nodes)</div>
                      <div className="text-xs opacity-70">Stress test with many nodes</div>
                    </button>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      These buttons bypass AI generation and inject pre-generated test roadmaps for development purposes.
                    </p>
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
        </div>
      </AuroraBackground>
    </section>
  );
} 