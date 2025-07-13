"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, CheckCircle2, Circle, Edit2, X, MessageSquare, Download, FileText } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { textStyles } from '@/lib/styles';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  tools: string[];
  metadata: {
    complexity: string;
    requiredSkills?: string[];
  };
}

interface Phase {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  estimatedTime: number;
  dependencies: string[];
  tasks: Task[];
  tools: string[];
  status: 'pending' | 'completed';
  metadata: {
    complexity: string;
    order: number;
  };
}

export interface RoadmapData {
  phases: Phase[];
  title: string;
  description: string;
}

export interface RoadmapDisplayProps {
  roadmap: RoadmapData;
  onTaskToggle?: (phaseId: string, taskId: string) => void;
  onTitleEdit?: (newTitle: string) => void;
  onPhaseTitleEdit?: (phaseId: string, newTitle: string) => void;
  showChatHistory?: boolean;
  chatHistory?: Array<{ role: string; content: string }>;
  phaseRefs?: Record<string, React.RefObject<HTMLDivElement | null>>;
}

export function RoadmapDisplay({ 
  roadmap, 
  onTaskToggle,
  onTitleEdit,
  onPhaseTitleEdit,
  showChatHistory = false,
  chatHistory = [],
  phaseRefs = {}
}: RoadmapDisplayProps) {
  const { t } = useTranslation();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState(roadmap.title);
  const [tempPhaseTitle, setTempPhaseTitle] = useState('');
  const [showChat, setShowChat] = useState(showChatHistory);
  const [showTooltips, setShowTooltips] = useState(true);

  // Initialize all phases as expanded
  useEffect(() => {
    setExpandedPhases(new Set(roadmap.phases.map(p => p.id)));
    // Hide tooltips after 10 seconds
    const timer = setTimeout(() => setShowTooltips(false), 10000);
    return () => clearTimeout(timer);
  }, [roadmap.phases]);

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const toggleTask = (phaseId: string, taskId: string) => {
    const taskKey = `${phaseId}-${taskId}`;
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskKey)) {
      newCompleted.delete(taskKey);
    } else {
      newCompleted.add(taskKey);
    }
    setCompletedTasks(newCompleted);
    onTaskToggle?.(phaseId, taskId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const calculatePhaseProgress = (phase: Phase) => {
    const completedCount = phase.tasks.filter(task => 
      completedTasks.has(`${phase.id}-${task.id}`)
    ).length;
    return phase.tasks.length > 0 ? (completedCount / phase.tasks.length) * 100 : 0;
  };

  const calculateTotalTime = () => {
    return roadmap.phases.reduce((total, phase) => total + phase.estimatedTime, 0);
  };

  const handleTitleSave = () => {
    onTitleEdit?.(tempTitle);
    setEditingTitle(false);
  };

  const handlePhaseTitleSave = (phaseId: string) => {
    onPhaseTitleEdit?.(phaseId, tempPhaseTitle);
    setEditingPhaseId(null);
  };

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Header with editable title */}
        <div className="mb-8 text-center">
          {editingTitle ? (
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b-2 border-neutral-300 dark:border-neutral-600 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button onClick={handleTitleSave} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X className="w-5 h-5 text-red-600" />
              </button>
            </div>
          ) : (
            <Tooltip open={showTooltips}>
              <TooltipTrigger asChild>
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2 cursor-pointer group" onClick={() => setEditingTitle(true)}>
                  {roadmap.title}
                  <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('project.roadmap.tooltip_edit_title')}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <p className="mt-2 text-neutral-600 dark:text-neutral-200 text-opacity-100">{roadmap.description}</p>
          
          {/* Total time summary */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-200">
            <Clock className="w-4 h-4" />
            <span>{t('project.roadmap.total_time')}: {calculateTotalTime()}h</span>
          </div>

          {/* Export buttons */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => exportToPDF(roadmap)}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              {t('project.roadmap.export_pdf')}
            </button>
            <button
              onClick={() => exportToCSV(roadmap)}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {t('project.roadmap.export_csv')}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Phase Navigation Sidebar */}
          <div className="hidden lg:block w-64 sticky top-4 h-fit">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 p-4">
              <h3 className="font-medium mb-4">{t('project.roadmap.phases')}</h3>
              <nav className="space-y-2">
                {roadmap.phases.map((phase, index) => {
                  const progress = calculatePhaseProgress(phase);
                  return (
                    <a
                      key={phase.id}
                      href={`#${phase.id}`}
                      className="block p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('project.roadmap.phase')} {index + 1}</span>
                        <span className="text-xs text-neutral-500">{Math.round(progress)}%</span>
                      </div>
                      <div className="mt-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </a>
                  );
                })}
              </nav>

              {/* Chat History Toggle */}
              {chatHistory.length > 0 && (
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="mt-6 w-full p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">{t('project.roadmap.chat_history')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-4">
            {roadmap.phases.map((phase, phaseIndex) => {
              const isExpanded = expandedPhases.has(phase.id);
              const phaseProgress = calculatePhaseProgress(phase);
              
              return (
                <motion.div
                  key={phase.id}
                  id={phase.id}
                  ref={phaseRefs[phase.id]}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: phaseIndex * 0.1 }}
                  className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800"
                >
                  {/* Phase Header */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => togglePhase(phase.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {editingPhaseId === phase.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={tempPhaseTitle}
                                onChange={(e) => setTempPhaseTitle(e.target.value)}
                                className="text-lg font-semibold bg-transparent border-b-2 border-neutral-300 dark:border-neutral-600 focus:outline-none focus:border-blue-500"
                                autoFocus
                              />
                              <button onClick={() => handlePhaseTitleSave(phase.id)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </button>
                              <button onClick={() => setEditingPhaseId(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <Tooltip open={showTooltips && phaseIndex === 0}>
                              <TooltipTrigger asChild>
                                <h3 
                                  className="text-lg font-semibold flex items-center gap-2 group"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTempPhaseTitle(phase.title);
                                    setEditingPhaseId(phase.id);
                                  }}
                                >
                                  {phase.title}
                                  <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('project.roadmap.tooltip_edit_phase')}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span className={cn("px-2 py-1 text-xs font-medium rounded", getPriorityColor(phase.priority))}>
                            {phase.priority}
                          </span>
                          <span className="text-sm text-neutral-500 dark:text-neutral-200 text-opacity-100">
                            {phase.estimatedTime}h
                          </span>
                        </div>
                        {!isExpanded && (
                          <div className="mt-2 flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-200 text-opacity-100">
                            <span>{phase.tasks.length} {t('project.roadmap.tasks')}</span>
                            <span>{phaseProgress}% {t('project.roadmap.complete')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${phaseProgress}%` }}
                        transition={{ duration: 0.5, delay: phaseIndex * 0.1 + 0.2 }}
                      />
                    </div>
                  </div>

                  {/* Phase Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <div className="p-4 space-y-4">
                          <p className="text-neutral-600 dark:text-neutral-200 text-opacity-100">{phase.description}</p>
                          
                          {/* Phase Metadata */}
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 rounded">
                              {phase.category}
                            </span>
                            {phase.dependencies.length > 0 && (
                              <span className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 rounded">
                                {t('project.roadmap.depends_on')}: {phase.dependencies.join(', ')}
                              </span>
                            )}
                            {phase.tools.map(tool => (
                              <span key={tool} className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                                {tool}
                              </span>
                            ))}
                          </div>

                          {/* Tasks */}
                          {phase.tasks.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-neutral-700 dark:text-neutral-200 text-opacity-100">
                                {t('project.roadmap.tasks')}
                              </h4>
                              {phase.tasks.map((task, taskIndex) => {
                                const taskKey = `${phase.id}-${task.id}`;
                                const isCompleted = completedTasks.has(taskKey);
                                
                                return (
                                  <Tooltip key={task.id} open={showTooltips && phaseIndex === 0 && taskIndex === 0}>
                                    <TooltipTrigger asChild>
                                      <motion.div
                                        layout
                                        className={cn(
                                          "p-3 rounded-lg border transition-all cursor-pointer",
                                          isCompleted
                                            ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                                            : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                        )}
                                        onClick={() => toggleTask(phase.id, task.id)}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="mt-0.5">
                                            {isCompleted ? (
                                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            ) : (
                                              <Circle className="w-5 h-5 text-neutral-400" />
                                            )}
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <h5 className={cn(
                                                "font-medium text-sm",
                                                isCompleted && "line-through text-neutral-500"
                                              )}>
                                                {task.title}
                                              </h5>
                                              <div className="flex items-center gap-2">
                                                <span className={cn(
                                                  "text-xs",
                                                  getPriorityColor(task.priority),
                                                  "px-1.5 py-0.5 rounded"
                                                )}>
                                                  {task.priority}
                                                </span>
                                                <span className="text-xs text-neutral-500 dark:text-neutral-200 text-opacity-100">
                                                  {task.estimatedTime}h
                                                </span>
                                              </div>
                                            </div>
                                            <p className={cn(
                                              "text-xs mt-1 text-neutral-600 dark:text-neutral-200 text-opacity-100",
                                              isCompleted && "line-through"
                                            )}>
                                              {task.description}
                                            </p>
                                            {task.tools.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-2">
                                                {task.tools.map(tool => (
                                                  <span key={tool} className="px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                                                    {tool}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('project.roadmap.tooltip_check_task')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Chat History Panel */}
          <AnimatePresence>
            {showChat && chatHistory.length > 0 && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="sticky top-4 h-fit"
              >
                <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">{t('project.roadmap.chat_history')}</h3>
                    <button
                      onClick={() => setShowChat(false)}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {chatHistory.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          message.role === 'user'
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100"
                            : "bg-neutral-100 dark:bg-neutral-800"
                        )}
                      >
                        <div className="font-medium mb-1">
                          {message.role === 'user' ? t('project.roadmap.you') : 'Briki AI'}
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
} 