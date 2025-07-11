"use client";

import { useState, useRef, createRef, RefObject } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, ActiveTabIndicator } from "@/components/ui/tabs";
import { Project } from '@/types/project';
import { useProjectStore } from '@/store/useProjectStore';
import RoadmapFlow from './RoadmapFlow';
import { RoadmapDisplay, RoadmapData } from './RoadmapDisplay';
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGroup } from "framer-motion"

export function RoadmapTabs() {
  const [activeTab, setActiveTab] = useState("visual");
  const { currentProject } = useProjectStore();
  
  const phaseRefs = useRef<Record<string, RefObject<HTMLDivElement | null>>>({});
  if (currentProject) {
    currentProject.roadmap.forEach(phase => {
      if (!phaseRefs.current[phase.id]) {
        phaseRefs.current[phase.id] = createRef<HTMLDivElement>();
      }
    });
  }

  const handleNodeClick = (phaseId: string) => {
    setActiveTab("checklist");
    setTimeout(() => {
      phaseRefs.current[phaseId]?.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  };
  
  const handleTaskToggle = (phaseId: string, taskId: string) => {
    if (!currentProject) return;

    const roadmap = currentProject.roadmap.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          children: phase.children?.map(task => 
            task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
          )
        };
      }
      return phase;
    });

    useProjectStore.setState({ 
      currentProject: { ...currentProject, roadmap, updatedAt: new Date() } 
    });
  };

  if (!currentProject) return null;

  const roadmapDisplayData: RoadmapData = {
    title: currentProject.title,
    description: currentProject.description,
    phases: currentProject.roadmap.map(node => ({
      id: node.id,
      title: node.title,
      description: node.description,
      priority: 'medium',
      category: 'general',
      estimatedTime: 0,
      dependencies: [],
      tasks: node.children?.map(child => ({
        id: child.id,
        title: child.title,
        description: child.description,
        status: child.isCompleted ? 'completed' : 'pending',
        priority: 'medium',
        estimatedTime: 0,
        tools: child.tools?.map(t => t.name) || [],
        metadata: { complexity: 'low' }
      })) || [],
      tools: node.tools?.map(t => t.name) || [],
      status: 'pending',
      metadata: { complexity: 'medium', order: 0 }
    }))
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-8">
          <LayoutGroup>
            <TabsList>
              <TabsTrigger value="visual" className="relative">
                Visual Map
                {activeTab === 'visual' && <ActiveTabIndicator active={true} layoutId="active-tab" />}
              </TabsTrigger>
              <TabsTrigger value="checklist" className="relative">
                Checklist
                {activeTab === 'checklist' && <ActiveTabIndicator active={true} layoutId="active-tab" />}
              </TabsTrigger>
            </TabsList>
          </LayoutGroup>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="visual">
              <RoadmapFlow onNodeClick={handleNodeClick} />
            </TabsContent>
            <TabsContent value="checklist">
              <RoadmapDisplay
                roadmap={roadmapDisplayData}
                onTaskToggle={handleTaskToggle}
                phaseRefs={phaseRefs.current}
              />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
} 