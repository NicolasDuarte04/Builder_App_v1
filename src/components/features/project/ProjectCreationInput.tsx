"use client";

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { RoadmapDisplay } from '@/components/features/roadmap/RoadmapDisplay';
import { AlertCircle, RefreshCw, Home, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInterface } from '@/components/features/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { useProjectStore } from '@/store/useProjectStore';
import { GenerationState } from '@/types/store';
import { extractProjectDetails, isCasualInput } from '@/lib/utils';

export function ProjectCreationInput() {
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const { t } = useTranslation();
  
  // Get generation flow state from store
  const { 
    generationState, 
    generationFlowData, 
    setGenerationState, 
    setGenerationFlowData,
    resetGenerationFlow 
  } = useProjectStore();

  const placeholders = [
    t('project.creation.placeholders.habit_app'),
    t('project.creation.placeholders.ecommerce'),
    t('project.creation.placeholders.dashboard'),
  ];

  const handleSubmit = async (prompt: string) => {
    const newChatHistory = [...chatHistory, { role: 'user', content: prompt }];
    setChatHistory(newChatHistory);

    // Handle different states in the generation flow
    switch (generationState) {
      case GenerationState.AWAITING_USER_INPUT:
        // Save initial prompt and ask for details
        setGenerationFlowData({ initialPrompt: prompt });
        setGenerationState(GenerationState.ASKING_FOR_DETAILS);
        setChatHistory([...newChatHistory, {
          role: 'assistant',
          content: t('project.creation.messages.ask_details')
        }]);
        break;

      case GenerationState.ASKING_FOR_DETAILS:
        await handleDetailsInput(prompt, newChatHistory);
        break;

      case GenerationState.CONFIRMING_DETAILS:
        // Check if user confirms with more natural language
        const lowerPrompt = prompt.toLowerCase();
        const confirmationPhrases = [
          'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'go', 'generate', 
          'please', 'create', 'do it', 'start', 'confirm', 'correct',
          'that\'s right', 'looks good', 'perfect', 'great', 'let\'s go'
        ];
        
        if (confirmationPhrases.some(phrase => lowerPrompt.includes(phrase))) {
          await generateRoadmap(newChatHistory);
        } else {
          // User wants to change something
          setGenerationState(GenerationState.ASKING_FOR_DETAILS);
          setGenerationFlowData({ projectName: null, projectDescription: null });
          setChatHistory([...newChatHistory, {
            role: 'assistant',
            content: t('project.creation.messages.change_details')
          }]);
        }
        break;

      case GenerationState.DISPLAYING:
        // Start a new conversation
        handleStartOver();
        handleSubmit(prompt);
        break;
    }
  };

  const handleDetailsInput = async (prompt: string, currentChatHistory: Array<{ role: string; content: string }>) => {
    // Check for casual input first
    if (isCasualInput(prompt)) {
      setChatHistory([...currentChatHistory, {
        role: 'assistant',
        content: t('project.creation.messages.casual_input')
      }]);
      return;
    }

    // Extract project details using intelligent parsing
    const extracted = extractProjectDetails(prompt);
    
    // Get current state
    const currentName = generationFlowData.projectName;
    const currentDescription = generationFlowData.projectDescription;
    
    let updatedName = currentName;
    let updatedDescription = currentDescription;
    
    // Update what we extracted
    if (extracted.name) {
      updatedName = extracted.name;
    }
    if (extracted.description) {
      updatedDescription = extracted.description;
    }
    
    // If we couldn't extract anything useful and have low confidence
    if (!extracted.name && !extracted.description && extracted.confidence === 'low') {
      setChatHistory([...currentChatHistory, {
        role: 'assistant',
        content: t('project.creation.messages.unclear_input')
      }]);
      return;
    }

    // Update the store with what we have
    setGenerationFlowData({ 
      projectName: updatedName, 
      projectDescription: updatedDescription 
    });

    // Determine what to ask for next
    const hasName = updatedName && updatedName.trim().length > 0;
    const hasDescription = updatedDescription && updatedDescription.trim().length > 0;

    if (hasName && hasDescription) {
      // We have both - move to confirmation
      setGenerationState(GenerationState.CONFIRMING_DETAILS);
      setChatHistory([...currentChatHistory, {
        role: 'assistant',
        content: t('project.creation.messages.confirm_details')
          .replace('{name}', updatedName!)
          .replace('{description}', updatedDescription!)
      }]);
    } else if (hasName && !hasDescription) {
      // We have name, need description
      setChatHistory([...currentChatHistory, {
        role: 'assistant',
        content: t('project.creation.messages.ask_description_only')
      }]);
    } else if (!hasName && hasDescription) {
      // We have description, need name
      setChatHistory([...currentChatHistory, {
        role: 'assistant',
        content: t('project.creation.messages.ask_name_only')
      }]);
    } else {
      // We don't have either - ask for both again
      setChatHistory([...currentChatHistory, {
        role: 'assistant',
        content: t('project.creation.messages.ask_both_again')
      }]);
    }
  };

  const generateRoadmap = async (currentChatHistory: Array<{ role: string; content: string }>) => {
    setIsLoading(true);
    setError(null);
    setGenerationState(GenerationState.GENERATING);

    // Combine the initial prompt with the project details for better context
    const fullPrompt = `Create a roadmap for: ${generationFlowData.projectName}. 
    Description: ${generationFlowData.projectDescription}. 
    Original idea: ${generationFlowData.initialPrompt}`;
    
    setLastPrompt(fullPrompt);

    try {
      const response = await fetch('/api/ai/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate roadmap');
      }

      const data = await response.json();
      const parsed = JSON.parse(data.roadmap ?? '{}');
      
      // Update the roadmap with our confirmed project details
      parsed.title = generationFlowData.projectName || parsed.title;
      parsed.description = generationFlowData.projectDescription || parsed.description;
      
      setRoadmap(parsed);
      setGenerationState(GenerationState.DISPLAYING);
      
      // Add success message to chat
      setChatHistory([...currentChatHistory, { 
        role: 'assistant', 
        content: t('project.creation.messages.success')
          .replace('{title}', parsed.title)
          .replace('{phases}', parsed.phases?.length || 0)
      }]);
      
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
      setGenerationState(GenerationState.CONFIRMING_DETAILS);
      
      // Add error message to chat history
      setChatHistory([...currentChatHistory, {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMessage}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateClick = async () => {
    if (generationState === GenerationState.CONFIRMING_DETAILS) {
      const currentChatHistory = [...chatHistory, {
        role: 'user',
        content: 'Yes, generate the roadmap!'
      }];
      setChatHistory(currentChatHistory);
      await generateRoadmap(currentChatHistory);
    }
  };

  const handleRetry = () => {
    if (lastPrompt) {
      generateRoadmap(chatHistory);
    }
  };

  const handleStartOver = () => {
    setRoadmap(null);
    setError(null);
    setChatHistory([]);
    setLastPrompt('');
    resetGenerationFlow();
  };

  const handleTaskToggle = (phaseId: string, taskId: string) => {
    if (!roadmap) return;
    
    const updatedPhases = roadmap.phases.map((phase: any) => {
      if (phase.id === phaseId) {
        const updatedTasks = phase.tasks.map((task: any) => {
          if (task.id === taskId) {
            return { ...task, isCompleted: !task.isCompleted };
          }
          return task;
        });
        return { ...phase, tasks: updatedTasks };
      }
      return phase;
    });

    setRoadmap({ ...roadmap, phases: updatedPhases });
    // TODO: Save to Supabase
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

  // Check if we have both name and description for the Generate button
  const canGenerateRoadmap = Boolean(
    generationFlowData.projectName && 
    generationFlowData.projectDescription &&
    generationState === GenerationState.CONFIRMING_DETAILS
  );

  return (
    <div className="w-full">
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Left Column: Chat Interface */}
        <div className="space-y-6">
          <ChatInterface
            onSubmit={handleSubmit}
            isLoading={isLoading || generationState === GenerationState.GENERATING}
            placeholders={placeholders}
            chatHistory={chatHistory}
          />
          
          {/* Generate Roadmap Button - Only show when we have complete details */}
          <AnimatePresence>
            {canGenerateRoadmap && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-center"
              >
                <Button
                  onClick={handleGenerateClick}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#009BFF] to-cyan-500 text-white hover:shadow-lg transition-all"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t('project.creation.generate_roadmap')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl rounded-lg border border-red-200 dark:border-red-800">
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
                        <Button
                          onClick={handleRetry}
                          disabled={!lastPrompt || isLoading}
                          variant="magic"
                          className="text-sm"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('project.creation.retry')}
                        </Button>
                        <Button
                          onClick={handleStartOver}
                          variant="outline"
                          className="text-sm"
                        >
                          <Home className="w-4 h-4 mr-2" />
                          {t('project.creation.start_over')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Roadmap Display */}
        <div className="relative">
          {roadmap ? (
            <>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#009BFF] to-cyan-500 rounded-lg blur opacity-30" />
              <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-lg p-8 shadow-xl border border-neutral-200/50 dark:border-neutral-800/50">
                <RoadmapDisplay
                  roadmap={roadmap}
                  onTaskToggle={handleTaskToggle}
                  onTitleEdit={handleTitleEdit}
                  onPhaseTitleEdit={handlePhaseTitleEdit}
                  showChatHistory={false}
                  chatHistory={chatHistory}
                />
              </div>
            </>
          ) : (
            <div className="relative bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700">
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="mb-4 p-4 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <Sparkles className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Your roadmap will appear here
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
                  Start by describing your project idea in the chat, and I'll generate a detailed roadmap for you.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {roadmap && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          onClick={handleStartOver}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-[#009BFF] to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all group"
          title={t('project.creation.create_new')}
        >
          <Home className="w-6 h-6" />
          <span className="absolute right-full mr-2 px-2 py-1 bg-neutral-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {t('project.creation.create_new')}
          </span>
        </motion.button>
      )}
    </div>
  );
} 