"use client";

import { useEffect, useRef } from 'react';
import { useBrikiEvent, BrikiEvents, StructuredDataEvent } from '@/lib/event-bus';
import { usePlanResults } from '@/contexts/PlanResultsContext';
import { useTranslation } from '@/hooks/useTranslation';

interface PlanResultsObserverProps {
  appendAssistantMessage?: (content: string) => void;
}

/**
 * PlanResultsObserver - Listens for structured data events and updates the right panel
 * This component bridges the event bus with the PlanResultsContext
 */
export function PlanResultsObserver({ appendAssistantMessage }: PlanResultsObserverProps = {}) {
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();
  const { language } = useTranslation();

  // Use refs to track acknowledgment state across renders
  const lastAcknowledgedPlansRef = useRef<string | null>(null);
  const lastAcknowledgmentTimeRef = useRef<number>(0);

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
      
      // Add a short acknowledgment message when plans are shown (only for new searches)
      if (appendAssistantMessage && event.data.plans.length > 0) {
        const plansKey = JSON.stringify(event.data.plans.map((p: any) => p.id).sort());
        const currentTime = Date.now();
        
        // Check if this is a fresh search and we haven't acknowledged these plans recently
        const isFreshSearch = !event.metadata?.fromPin;
        const isNewPlans = plansKey !== lastAcknowledgedPlansRef.current;
        const isRecentAcknowledgment = currentTime - lastAcknowledgmentTimeRef.current < 2000; // 2 second cooldown
        
        if (isFreshSearch && isNewPlans && !isRecentAcknowledgment) {
          lastAcknowledgedPlansRef.current = plansKey;
          lastAcknowledgmentTimeRef.current = currentTime;
          
          // Vary the acknowledgment messages based on language
          const acknowledgments = language === 'en' ? [
            `I found ${event.data.plans.length} options for you.`,
            `Here are ${event.data.plans.length} plans that match.`,
            `Check out these ${event.data.plans.length} available plans.`,
            `I'm showing you ${event.data.plans.length} alternatives.`
          ] : [
            `Encontré ${event.data.plans.length} opciones para ti.`,
            `Aquí tienes ${event.data.plans.length} planes que se ajustan.`,
            `Mira estos ${event.data.plans.length} planes disponibles.`,
            `Te muestro ${event.data.plans.length} alternativas.`
          ];
          const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
          
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            if (appendAssistantMessage) {
              appendAssistantMessage(randomAck);
            }
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
      
      // Add acknowledgment for this event too (with improved deduplication)
      if (appendAssistantMessage && data.plans.length > 0) {
        const plansKey = JSON.stringify(data.plans.map((p: any) => p.id).sort());
        const currentTime = Date.now();
        
        // Check if we haven't acknowledged these plans recently
        const isNewPlans = plansKey !== lastAcknowledgedPlansRef.current;
        const isRecentAcknowledgment = currentTime - lastAcknowledgmentTimeRef.current < 2000; // 2 second cooldown
        
        if (isNewPlans && !isRecentAcknowledgment) {
          lastAcknowledgedPlansRef.current = plansKey;
          lastAcknowledgmentTimeRef.current = currentTime;
          
          const acknowledgments = language === 'en' ? [
            `I found ${data.plans.length} plans.`,
            `Here are ${data.plans.length} options.`,
            `Check these ${data.plans.length} plans.`
          ] : [
            `Encontré ${data.plans.length} planes.`,
            `Aquí hay ${data.plans.length} opciones.`,
            `Revisa estos ${data.plans.length} planes.`
          ];
          const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
          
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            if (appendAssistantMessage) {
              appendAssistantMessage(randomAck);
            }
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