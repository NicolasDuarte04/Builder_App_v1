"use client";

import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';
import type { TemplatePlan } from '@/types/results';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { useProposal } from '@/state/proposal';
import { isTemplatesFallbackEnabled } from '@/lib/flags';

interface PlanResultsData {
  title: string;
  plans: InsurancePlan[];
  category?: string;
  query?: string;
  timestamp?: Date;
  // Optional filters used to produce these results (CTA/search)
  filters?: any;
  // Template support
  templates?: TemplatePlan[];
  hasRealPlans?: boolean;
  isExactMatch?: boolean;
  noExactMatchesFound?: boolean;
  dataSource?: string;
  // Context source (e.g., 'chat_tool')
  source?: string;
  // Analysis results support
  analysis?: any;
  analysisType?: 'policy_analysis';
  // Sources support (normalized plans from documents/text)
  sources?: any[];
  // Telemetry tracking
  requestId?: string;
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
  defaultDualPanelMode = false // Default: start in single panel; open right panel explicitly when needed
}: PlanResultsProviderProps) {
  const [currentResults, setCurrentResults] = useState<PlanResultsData | null>(null);
  const [isRightPanelOpen, setRightPanelOpen] = useState(false);
  const [isDualPanelMode, setDualPanelMode] = useState(defaultDualPanelMode);
  
  // De-duplication guard for telemetry
  const processedRequestIds = useRef<Set<string>>(new Set());

  // CORE GEMINI-STYLE METHODS
  const showPanelWithPlans = async (results: PlanResultsData) => {
    const isDev = process.env.NODE_ENV !== 'production';
    // Generate requestId if not provided
    const requestId = results.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Coerce templates based on flag
    const templates = isTemplatesFallbackEnabled() ? (results.templates ?? []) : [];
    
    const newResults = {
      ...results,
      templates,
      requestId,
      timestamp: new Date()
    };
    
    // [AUDIT] Context injection
    const uiPhaseBefore = (() => { try { return useProposal.getState().uiPhase; } catch { return 'unknown'; } })();
    if (isDev) {
      console.log('[AUDIT] Context injection:', {
        plansCount: results.plans?.length || 0,
        templatesCount: templates.length || 0,
        sourcesCount: results.sources?.length || 0,
        uiPhaseBefore,
        requestId
      });
      console.log('🎯 GEMINI-STYLE: Auto-opening right panel with plans:', newResults);
    }
    
    // Fire consolidated telemetry (with de-duplication)
    if (!processedRequestIds.current.has(requestId)) {
      processedRequestIds.current.add(requestId);
      
      try {
        const { sessionId, userId } = await getUserContext();
        const planCount = results.plans?.length || 0;
        const templateCount = templates.length || 0;
        const sourcesCount = results.sources?.length || 0;
        const hasRealPlans = results.hasRealPlans !== false && planCount > 0;
        const dataSource = results.dataSource || (templateCount > 0 && planCount === 0 ? 'templates' : planCount > 0 ? 'plans_v2' : 'mixed');
        
        // RESULTS_INJECTED - fired when results are provided to the panel
        telemetry.track(telemetry.events.RESULTS_INJECTED, {
          requestId,
          category: results.category,
          dataSource,
          planCount,
          templateCount,
          hasRealPlans,
          sessionId,
          userId
        });
        
        // If only templates are being shown (no plans, no sources) and fallback is enabled
        if (templateCount > 0 && planCount === 0 && sourcesCount === 0 && isTemplatesFallbackEnabled()) {
          telemetry.track(telemetry.events.TEMPLATES_GENERATED, {
            reason: 'no_catalog_results',
            templateCount,
            category: results.category,
            sessionId,
            userId
          });
        }
        
        // Emit NO_RESULTS_SHOWN when nothing to show (once per requestId)
        if (planCount === 0 && templateCount === 0) {
          telemetry.track(telemetry.events.NO_RESULTS_SHOWN, {
            requestId,
            fallbackDisabled: !isTemplatesFallbackEnabled(),
            sessionId,
            userId
          });
        }
      } catch (err) {
        console.error('Telemetry error:', err);
      }
    }
    
    setCurrentResults(newResults);
    setDualPanelMode(true);
    setRightPanelOpen(true);
    try { useProposal.getState().setUiPhase('results'); } catch {}
    if (isDev) {
      const hasPlans = (results.plans?.length || 0) > 0;
      const hasTemplates = (templates.length || 0) > 0;
      const hasSources = (results.sources?.length || 0) > 0;
      const itemCount = (results.plans?.length || 0) || (templates.length || 0) || (results.sources?.length || 0);
      const itemType = hasPlans ? 'plans' : hasTemplates ? 'templates' : hasSources ? 'sources' : 'none';
      console.log(`✅ Right panel opened with ${itemCount} ${itemType}`);
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