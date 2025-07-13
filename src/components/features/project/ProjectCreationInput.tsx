"use client";

import { useState, useRef, useEffect, createRef, RefObject, forwardRef, ForwardRefExoticComponent, RefAttributes, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RoadmapDisplay, RoadmapData } from '@/components/features/roadmap/RoadmapDisplay';
import { AlertCircle, Home, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChatInterface } from '@/components/features/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/store/useProjectStore';
import { useBrikiChat } from '@/hooks/useBrikiChat';
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from '@/lib/utils';

// --- Inlined Tabs Components (Workaround) ---
const Tabs = TabsPrimitive.Root
const TabsList = forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => <TabsPrimitive.List ref={ref} className={cn("inline-flex h-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 text-neutral-500 dark:text-neutral-200", className)} {...props} />)
TabsList.displayName = TabsPrimitive.List.displayName
const TabsTrigger = forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, children, ...props }, ref) => <TabsPrimitive.Trigger ref={ref} className={cn("relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-neutral-900 data-[state=active]:dark:text-neutral-100", className)} {...props}>{children}</TabsPrimitive.Trigger>)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName
const TabsContent = forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-4 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2", className)} {...props} />)
TabsContent.displayName = TabsPrimitive.Content.displayName
const ActiveTabIndicator = ({ active, layoutId }: { active: boolean, layoutId: string }) => { if (!active) return null; return (<motion.div layoutId={layoutId} className="absolute inset-0 z-0 h-full bg-white dark:bg-neutral-900 rounded-md shadow-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />) }

// --- End Inlined Tabs Components ---

const RoadmapFlow = dynamic(() => import('@/components/features/roadmap/RoadmapFlow') as Promise<{ default: ForwardRefExoticComponent<{ onNodeClick: (phaseId: string) => void; } & RefAttributes<unknown>> }>, { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center"><div className="animate-pulse text-neutral-500">Loading Visual Map...</div></div> });

export function ProjectCreationInput() {
  const { t } = useTranslation();
  const roadmapRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("visual");
  
  const currentProject = useProjectStore(state => state.currentProject);
  const isGenerating = useProjectStore(state => state.isGenerating);
  const error = useProjectStore(state => state.error);
  const chatHistory = useProjectStore(state => state.chatHistory);
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading,
    generateRoadmap,
    isRoadmapReady,
    clearChat,
  } = useBrikiChat();

  const phaseRefs = useRef<Record<string, RefObject<HTMLDivElement>>>({});

  useEffect(() => {
    if (currentProject) {
      const newPhaseRefs: Record<string, RefObject<HTMLDivElement>> = {};
      currentProject.roadmap.forEach(phase => {
        newPhaseRefs[phase.id] = phaseRefs.current[phase.id] || createRef<HTMLDivElement>();
      });
      phaseRefs.current = newPhaseRefs;
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentProject && roadmapRef.current) {
      setTimeout(() => { roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 750);
    }
  }, [currentProject]);

  const handleNodeClick = (phaseId: string) => {
    setActiveTab("checklist");
    setTimeout(() => {
      phaseRefs.current[phaseId]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleTaskToggle = (phaseId: string, taskId: string) => {
    if (!currentProject) return;
    const roadmap = currentProject.roadmap.map(phase => {
      if (phase.id === phaseId) {
        return { ...phase, children: phase.children?.map(task => task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task) };
      }
      return phase;
    });
    useProjectStore.setState({ currentProject: { ...currentProject, roadmap, updatedAt: new Date() } });
  };

  const roadmapDisplayData: RoadmapData | null = useMemo(() => {
    if (!currentProject) return null;

    return {
      title: currentProject.title,
      description: currentProject.description,
      phases: currentProject.roadmap.map(node => ({
        id: node.id, title: node.title, description: node.description, priority: 'medium', category: 'general', estimatedTime: 0, dependencies: [],
        tasks: node.children?.map(child => ({ id: child.id, title: child.title, description: child.description, status: child.isCompleted ? 'completed' : 'pending', priority: 'medium', estimatedTime: 0, tools: child.tools?.map(t => t.name) || [], metadata: { complexity: 'low' } })) || [],
        tools: node.tools?.map(t => t.name) || [], status: 'pending', metadata: { complexity: 'medium', order: 0 }
      }))
    };
  }, [currentProject]);

  const handleStartOver = () => {
    clearChat();
  }

  const isLoading = isChatLoading || isGenerating;

  return (
    <div className="w-full">
      <div className="space-y-12">
        <div className="space-y-6">
          <form onSubmit={handleSubmit}>
            <ChatInterface
              handleInputChange={handleInputChange}
              inputValue={input}
              isLoading={isLoading}
              chatHistory={messages} // Use messages directly from useChat instead of store
            />
          </form>
          <AnimatePresence>
            {isRoadmapReady && !currentProject && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full">
                <Button 
                  onClick={generateRoadmap} 
                  disabled={isGenerating} 
                  className="relative z-50 w-full bg-gradient-to-r from-[#009BFF] to-cyan-500 hover:from-[#0088E6] hover:to-cyan-600 text-white hover:shadow-lg transition-all py-6 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />Generating Roadmap...</>) : (<><Sparkles className="w-6 h-6 mr-3" />Generate Project Roadmap</>)}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="p-4 bg-red-50/80 dark:bg-red-900/20"><div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-500 mt-0.5" /><div className="flex-1"><p className="text-red-700 dark:text-red-400 font-medium">{t('project.creation.error_title')}</p><p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p></div></div></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative" ref={roadmapRef}>
          <AnimatePresence>
          {currentProject && roadmapDisplayData ? (
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex justify-center mb-8">
                    <LayoutGroup>
                      <TabsList>
                        <TabsTrigger value="visual" className="relative">Visual Map<ActiveTabIndicator active={activeTab === 'visual'} layoutId="active-tab" /></TabsTrigger>
                        <TabsTrigger value="checklist" className="relative">Checklist<ActiveTabIndicator active={activeTab === 'checklist'} layoutId="active-tab" /></TabsTrigger>
                      </TabsList>
                    </LayoutGroup>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                      <TabsContent value="visual">
                        <ErrorBoundary fallback={<p>Error loading visual map.</p>}><RoadmapFlow onNodeClick={handleNodeClick} /></ErrorBoundary>
                      </TabsContent>
                      <TabsContent value="checklist">
                        <RoadmapDisplay 
                          roadmap={roadmapDisplayData} 
                          phaseRefs={phaseRefs.current} 
                          onTaskToggle={handleTaskToggle}
                          chatHistory={messages} // Pass messages directly from useChat
                        />
                      </TabsContent>
                    </motion.div>
                  </AnimatePresence>
                </Tabs>
              </motion.div>
          ) : (
            !isGenerating && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700"><div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"><div className="mb-4 p-4 rounded-full bg-neutral-100 dark:bg-neutral-800"><Sparkles className="w-8 h-8 text-neutral-400" /></div><h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Your roadmap will appear here</h3><p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">Start by describing your project idea in the chat.</p></div></motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
      {currentProject && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }} onClick={handleStartOver} className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-[#009BFF] to-cyan-500 text-white rounded-full shadow-lg" title={t('project.creation.create_new')}>
          <Home className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
} 