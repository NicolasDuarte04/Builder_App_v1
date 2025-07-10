"use client";

import { useState } from 'react';
import { BrikiInput } from '@/components/chat/BrikiInput';
import { useTranslation } from '@/hooks/useTranslation';
import { RoadmapDisplay } from '@/components/features/roadmap/RoadmapDisplay';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ProjectCreationInput() {
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const { t } = useTranslation();

  const placeholders = [
    t('project.creation.placeholders.habit_app'),
    t('project.creation.placeholders.ecommerce'),
    t('project.creation.placeholders.dashboard'),
  ];

  const handleSubmit = async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setLastPrompt(prompt);

    // Add user prompt to chat history
    const newChatHistory = [...chatHistory, { role: 'user', content: prompt }];
    setChatHistory(newChatHistory);

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
      
      // Add AI response to chat history
      setChatHistory([...newChatHistory, { 
        role: 'assistant', 
        content: `Generated roadmap: ${parsed.title}\n\n${parsed.description}` 
      }]);
      
      setRoadmap(parsed);
    } catch (err) {
      console.error('Error generating roadmap:', err);
      let errorMessage = 'Failed to generate roadmap. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('JSON')) {
          errorMessage = 'The AI response was incomplete. Please try again with a simpler prompt.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (err.message.includes('API')) {
          errorMessage = 'API error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastPrompt) {
      handleSubmit(lastPrompt);
    }
  };

  const handleStartOver = () => {
    setRoadmap(null);
    setError(null);
    setChatHistory([]);
    setLastPrompt('');
  };

  const handleTaskToggle = (phaseId: string, taskId: string) => {
    // TODO: Implement Supabase persistence
    console.log('Task toggled:', phaseId, taskId);
  };

  const handleTitleEdit = (newTitle: string) => {
    if (roadmap) {
      setRoadmap({ ...roadmap, title: newTitle });
      // TODO: Save to Supabase
    }
  };

  const handlePhaseTitleEdit = (phaseId: string, newTitle: string) => {
    if (roadmap) {
      const updatedPhases = roadmap.phases.map((phase: any) =>
        phase.id === phaseId ? { ...phase, title: newTitle } : phase
      );
      setRoadmap({ ...roadmap, phases: updatedPhases });
      // TODO: Save to Supabase
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-16 py-12 space-y-6">
      {!roadmap && (
        <>
          <div className="space-y-4 max-w-3xl mx-auto">
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
            className="w-full max-w-3xl mx-auto"
          />
          
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto"
              >
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-700 dark:text-red-400 font-medium">
                        {t('project.creation.error_title')}
                      </p>
                      <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                        {error}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleRetry}
                          disabled={!lastPrompt || isLoading}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          {t('project.creation.retry')}
                        </button>
                        <button
                          onClick={handleStartOver}
                          className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Home className="w-4 h-4" />
                          {t('project.creation.start_over')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {roadmap && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <RoadmapDisplay
            roadmap={roadmap}
            onTaskToggle={handleTaskToggle}
            onTitleEdit={handleTitleEdit}
            onPhaseTitleEdit={handlePhaseTitleEdit}
            showChatHistory={true}
            chatHistory={chatHistory}
          />
          
          {/* Floating action button to start over */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            onClick={handleStartOver}
            className="fixed bottom-8 right-8 p-4 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors group"
            title={t('project.creation.create_new')}
          >
            <Home className="w-6 h-6" />
            <span className="absolute right-full mr-2 px-2 py-1 bg-neutral-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {t('project.creation.create_new')}
            </span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
} 