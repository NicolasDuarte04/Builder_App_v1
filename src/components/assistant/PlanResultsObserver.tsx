"use client";

import { useEffect } from 'react';
import { useBrikiEvent, BrikiEvents, StructuredDataEvent } from '@/lib/event-bus';
import { usePlanResults } from '@/contexts/PlanResultsContext';

/**
 * PlanResultsObserver - Listens for structured data events and updates the right panel
 * This component bridges the event bus with the PlanResultsContext
 */
export function PlanResultsObserver() {
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();

  // Listen for structured data events
  useBrikiEvent(BrikiEvents.STRUCTURED_DATA_RECEIVED, (event: StructuredDataEvent) => {
    console.log('📨 PlanResultsObserver: Received structured data event:', event);
    
    if (event.type === 'plans' && event.data?.plans?.length > 0 && isDualPanelMode) {
      showPanelWithPlans({
        title: event.data.title || 'Planes Recomendados',
        plans: event.data.plans,
        category: event.data.category,
        query: event.metadata?.query,
      });
    }
  });

  // Listen for specific insurance plans events
  useBrikiEvent(BrikiEvents.INSURANCE_PLANS_RECEIVED, (data: any) => {
    console.log('📨 PlanResultsObserver: Received insurance plans:', data);
    
    if (data?.plans?.length > 0 && isDualPanelMode) {
      showPanelWithPlans({
        title: data.title || 'Planes de Seguro',
        plans: data.plans,
        category: data.category,
        query: data.query,
      });
    }
  });

  // This component doesn't render anything
  return null;
}

// Hook for components that need to emit plan results
export function usePlanResultsEmitter() {
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();

  const emitPlanResults = (results: any) => {
    if (!results?.plans?.length) return;

    // Emit to right panel if in dual panel mode
    if (isDualPanelMode) {
      showPanelWithPlans(results);
    }
  };

  return { emitPlanResults, isDualPanelMode };
}