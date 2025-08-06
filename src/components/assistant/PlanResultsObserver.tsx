"use client";

import { useEffect } from 'react';
import { useBrikiEvent, BrikiEvents, StructuredDataEvent } from '@/lib/event-bus';
import { usePlanResults } from '@/contexts/PlanResultsContext';

interface PlanResultsObserverProps {
  appendAssistantMessage?: (content: string) => void;
}

/**
 * PlanResultsObserver - Listens for structured data events and updates the right panel
 * This component bridges the event bus with the PlanResultsContext
 */
export function PlanResultsObserver({ appendAssistantMessage }: PlanResultsObserverProps = {}) {
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();

  // Keep track of whether we've already shown an acknowledgment for this set of results
  let lastAcknowledgedPlans: string | null = null;

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
      
      // Add a short acknowledgment message when plans are shown
      if (appendAssistantMessage && event.data.plans.length > 0) {
        const plansKey = JSON.stringify(event.data.plans.map((p: any) => p.id));
        if (plansKey !== lastAcknowledgedPlans) {
          lastAcknowledgedPlans = plansKey;
          
          // Vary the acknowledgment messages
          const acknowledgments = [
            `Encontré ${event.data.plans.length} opciones para ti.`,
            `Aquí tienes ${event.data.plans.length} planes que se ajustan.`,
            `Mira estos ${event.data.plans.length} planes disponibles.`,
            `Te muestro ${event.data.plans.length} alternativas.`
          ];
          const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
          
          setTimeout(() => {
            appendAssistantMessage(randomAck);
          }, 500); // Small delay to ensure plans appear first
        }
      }
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
      
      // Add acknowledgment for this event too
      if (appendAssistantMessage && data.plans.length > 0) {
        const plansKey = JSON.stringify(data.plans.map((p: any) => p.id));
        if (plansKey !== lastAcknowledgedPlans) {
          lastAcknowledgedPlans = plansKey;
          
          const acknowledgments = [
            `Encontré ${data.plans.length} planes.`,
            `Aquí hay ${data.plans.length} opciones.`,
            `Revisa estos ${data.plans.length} planes.`
          ];
          const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
          
          setTimeout(() => {
            appendAssistantMessage(randomAck);
          }, 500);
        }
      }
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