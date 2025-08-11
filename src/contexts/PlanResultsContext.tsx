"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';

interface PlanResultsData {
  title: string;
  plans: InsurancePlan[];
  category?: string;
  query?: string;
  timestamp?: Date;
}

interface PlanResultsContextType {
  // Right panel state (Gemini-style)
  isRightPanelOpen: boolean;
  currentResults: PlanResultsData | null;
  
  // Core methods
  showPanelWithPlans: (results: PlanResultsData) => void;
  hideRightPanel: () => void;
  clearResults: () => void;
  
  // Layout state
  isDualPanelMode: boolean;
  setDualPanelMode: (enabled: boolean) => void;
  
  // Legacy compatibility (remove after refactor)
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  addPlanResults: (results: PlanResultsData) => void;
  isTwoPanelMode: boolean;
  setTwoPanelMode: (enabled: boolean) => void;
}

const PlanResultsContext = createContext<PlanResultsContextType | undefined>(undefined);

interface PlanResultsProviderProps {
  children: ReactNode;
  defaultDualPanelMode?: boolean;
}

export function PlanResultsProvider({ 
  children, 
  defaultDualPanelMode = true // Default to Gemini-style dual panel
}: PlanResultsProviderProps) {
  const [currentResults, setCurrentResults] = useState<PlanResultsData | null>(null);
  const [isRightPanelOpen, setRightPanelOpen] = useState(false);
  const [isDualPanelMode, setDualPanelMode] = useState(defaultDualPanelMode);

  // CORE GEMINI-STYLE METHODS
  const showPanelWithPlans = (results: PlanResultsData) => {
    const newResults = {
      ...results,
      timestamp: new Date()
    };
    
    console.log('🎯 GEMINI-STYLE: Auto-opening right panel with plans:', newResults);
    
    setCurrentResults(newResults);
    
    // AUTO-OPEN the right panel when plans are detected
    if (results.plans.length > 0) {
      setRightPanelOpen(true);
      console.log('✅ Right panel auto-opened with', results.plans.length, 'plans');
    }
  };

  const hideRightPanel = () => {
    setRightPanelOpen(false);
    console.log('🎯 Right panel hidden');
  };

  const clearResults = () => {
    setCurrentResults(null);
    setRightPanelOpen(false);
    console.log('🎯 Results cleared and panel hidden');
  };

  // LEGACY COMPATIBILITY (for gradual migration)
  const addPlanResults = (results: PlanResultsData) => {
    console.log('⚠️ LEGACY: addPlanResults called, routing to showPanelWithPlans');
    showPanelWithPlans(results);
  };

  const value: PlanResultsContextType = {
    // Core Gemini-style API
    isRightPanelOpen,
    currentResults,
    showPanelWithPlans,
    hideRightPanel,
    clearResults,
    isDualPanelMode,
    setDualPanelMode,
    
    // Legacy compatibility
    isSidebarOpen: isRightPanelOpen,
    setSidebarOpen: setRightPanelOpen,
    addPlanResults,
    isTwoPanelMode: isDualPanelMode,
    setTwoPanelMode: setDualPanelMode
  };

  return (
    <PlanResultsContext.Provider value={value}>
      {children}
    </PlanResultsContext.Provider>
  );
}

export function usePlanResults() {
  const context = useContext(PlanResultsContext);
  if (context === undefined) {
    throw new Error('usePlanResults must be used within a PlanResultsProvider');
  }
  return context;
}

// Hook for components that need to trigger the right panel (like MessageRenderer)
export function useRightPanelTrigger() {
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();
  return { showPanelWithPlans, isDualPanelMode };
}

// Legacy hook for backward compatibility
export function usePlanResultsUpdater() {
  const { addPlanResults, isTwoPanelMode } = usePlanResults();
  return { addPlanResults, isTwoPanelMode };
}