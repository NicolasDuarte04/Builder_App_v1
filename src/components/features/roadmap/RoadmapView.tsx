"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup, Variants, Easing } from "framer-motion";
import { useRoadmapStore } from "@/store/useRoadmapStore";
import { Task, TaskStatus, RoadmapPhase, Subtask, TaskAction } from "@/types/roadmap";
import { SubtaskCard } from "./SubtaskCard";
import { handleTaskAction } from "@/lib/actions/task-actions";

// Custom easing
const customEase: Easing = [0.2, 0.65, 0.3, 0.9];

// Animation variants
const animations = {
  task: {
    hidden: { 
      opacity: 0, 
      y: -5 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 500, 
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      y: -5,
      transition: { duration: 0.15 }
    }
  } as Variants,

  subtaskList: {
    hidden: { 
      opacity: 0, 
      height: 0,
      overflow: "hidden" 
    },
    visible: { 
      height: "auto", 
      opacity: 1,
      overflow: "visible",
      transition: { 
        duration: 0.25, 
        staggerChildren: 0.05,
        when: "beforeChildren",
        ease: customEase
      }
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: "hidden",
      transition: { 
        duration: 0.2,
        ease: customEase
      }
    }
  } as Variants,

  statusBadge: {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.08, 1],
      transition: { 
        duration: 0.35,
        ease: customEase
      }
    }
  } as Variants
};

// Status icon mapping
const statusIcons: Record<TaskStatus, React.ReactNode> = {
  'pending': <Circle className="text-muted-foreground h-4.5 w-4.5" />,
  'in-progress': <CircleDotDashed className="h-4.5 w-4.5 text-blue-500" />,
  'completed': <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />,
  'failed': <CircleX className="h-4.5 w-4.5 text-red-500" />,
  'need-help': <CircleAlert className="h-4.5 w-4.5 text-yellow-500" />
};

// Status color mapping
const statusColors: Record<TaskStatus, string> = {
  'pending': 'bg-muted text-muted-foreground',
  'in-progress': 'bg-blue-100 text-blue-700',
  'completed': 'bg-green-100 text-green-700',
  'failed': 'bg-red-100 text-red-700',
  'need-help': 'bg-yellow-100 text-yellow-700'
};

// Convert Task to Subtask for compatibility
function taskToSubtask(task: Task, parentId: string): Subtask {
  return {
    ...task,
    parentId,
    order: 0, // Default order
    status: task.status,
  };
}

// Ensure status is a valid TaskStatus
function validateStatus(status: string): TaskStatus {
  const validStatuses: TaskStatus[] = ['pending', 'in-progress', 'completed', 'failed', 'need-help'];
  if (validStatuses.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }
  return 'pending';
}

export function RoadmapView() {
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  
  const { roadmap, updatePhase, toggleTaskComplete } = useRoadmapStore();

  // Handle task expansion
  const handleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Handle subtask expansion
  const handleSubtaskExpand = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle status changes
  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (!roadmap) return;
    
    const phase = roadmap.phases.find(p => 
      p.tasks.some(t => t.id === taskId)
    );

    if (phase) {
      const updatedTasks = phase.tasks.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus }
          : task
      );

      const allCompleted = updatedTasks.every(t => t.status === 'completed');
      const newPhaseStatus: TaskStatus = allCompleted ? 'completed' : phase.status;

      updatePhase(phase.id, {
        ...phase,
        tasks: updatedTasks,
        status: newPhaseStatus
      });
    }
  };

  // Handle task actions
  const handleAction = async (_subtaskId: string, action: TaskAction) => {
    try {
      await handleTaskAction(action);
    } catch (error) {
      console.error('Error handling task action:', error);
    }
  };

  if (!roadmap) return null;

  return (
    <div className="bg-background text-foreground h-full overflow-auto p-2">
      <motion.div 
        className="bg-card border-border rounded-lg border shadow overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.3,
            ease: customEase
          }
        }}
      >
        <LayoutGroup>
          <div className="p-4 overflow-hidden">
            <ul className="space-y-1 overflow-hidden">
              {roadmap.phases.map((phase, index) => (
                <motion.li
                  key={phase.id}
                  className={`${index !== 0 ? "mt-1 pt-2" : ""}`}
                  variants={animations.task}
                  initial="hidden"
                  animate="visible"
                  layout
                >
                  {/* Phase header */}
                  <motion.div 
                    className="group flex items-center px-3 py-1.5 rounded-md"
                    whileHover={{ 
                      backgroundColor: "rgba(0,0,0,0.03)",
                      transition: { duration: 0.2 }
                    }}
                    onClick={() => handleTaskExpand(phase.id)}
                  >
                    <motion.div
                      className="mr-2 flex-shrink-0 cursor-pointer"
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {statusIcons[phase.status]}
                    </motion.div>

                    <div className="flex min-w-0 flex-grow items-center justify-between">
                      <span className={phase.status === 'completed' ? "text-muted-foreground line-through" : ""}>
                        {phase.title}
                      </span>

                      <motion.span
                        className={`rounded px-1.5 py-0.5 text-xs ${statusColors[phase.status]}`}
                        variants={animations.statusBadge}
                        initial="initial"
                        animate="animate"
                        key={phase.status}
                      >
                        {phase.status}
                      </motion.span>
                    </div>
                  </motion.div>

                  {/* Tasks list */}
                  <AnimatePresence mode="wait">
                    {expandedTasks.includes(phase.id) && (
                      <motion.div
                        className="relative overflow-hidden"
                        variants={animations.subtaskList}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        layout
                      >
                        <div className="absolute top-0 bottom-0 left-[20px] border-l-2 border-dashed border-muted-foreground/30" />
                        <ul className="mt-1 mr-2 mb-1.5 ml-3 space-y-0.5">
                          {phase.tasks.map(task => (
                            <SubtaskCard
                              key={task.id}
                              subtask={taskToSubtask(task, phase.id)}
                              onStatusChange={(status) => handleStatusChange(task.id, validateStatus(status))}
                              onActionTrigger={handleAction}
                              className="ml-6"
                            />
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              ))}
            </ul>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
} 