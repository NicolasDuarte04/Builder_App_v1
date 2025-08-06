"use client";

import { useEffect, useRef } from 'react';
import { useBrikiEvent, eventBus } from '@/lib/event-bus';
import { useTranslation } from '@/hooks/useTranslation';

interface PlanPinObserverProps {
  appendAssistantMessage: (content: string) => void;
}

// Track sent messages to prevent duplicates
const sentMessages = new Set<string>();

/**
 * PlanPinObserver - Listens for plan pin/unpin events and injects assistant messages
 */
export function PlanPinObserver({ appendAssistantMessage }: PlanPinObserverProps) {
  const lastPinnedPlanId = useRef<number | null>(null);
  const lastUnpinnedPlanId = useRef<number | null>(null);
  const { language } = useTranslation();
  
  // Listen for plan pinned events
  useBrikiEvent('plan-pinned', (event: any) => {
    console.log('📌 Plan pinned:', event);
    
    // Prevent duplicate messages for the same plan
    if (lastPinnedPlanId.current === event.plan.id) {
      console.log('Preventing duplicate pin message for plan:', event.plan.id);
      return;
    }
    
    lastPinnedPlanId.current = event.plan.id;
    
    // Short, varied messages based on language
    const messages = language === 'en' ? [
      `Pinned "${event.plan.name}".`,
      `Marked "${event.plan.name}".`,
      `Saved "${event.plan.name}".`
    ] : [
      `Marcaste "${event.plan.name}".`,
      `Plan fijado: "${event.plan.name}".`,
      `Guardado: "${event.plan.name}".`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    // Check if we've already sent this exact message
    const messageKey = `pin-${event.plan.id}`;
    if (!sentMessages.has(messageKey)) {
      sentMessages.add(messageKey);
      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        appendAssistantMessage(message);
      }, 100);
    }
  });
  
  // Listen for plan unpinned events
  useBrikiEvent('plan-unpinned', (event: any) => {
    console.log('📌 Plan unpinned:', event);
    
    // Prevent duplicate messages for the same plan
    if (lastUnpinnedPlanId.current === event.plan.id) {
      console.log('Preventing duplicate unpin message for plan:', event.plan.id);
      return;
    }
    
    lastUnpinnedPlanId.current = event.plan.id;
    
    // Only send message if all plans are unpinned
    if (event.pinnedCount === 0) {
      const messages = language === 'en' ? [
        `Unpinned.`,
        `Removed.`,
        `Cleared.`
      ] : [
        `Desmarcado.`,
        `Quitado.`,
        `Liberado.`
      ];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      const messageKey = `unpin-${event.plan.id}`;
      if (!sentMessages.has(messageKey)) {
        sentMessages.add(messageKey);
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          appendAssistantMessage(message);
        }, 100);
      }
    }
  });

  // This component doesn't render anything
  return null;
}

// Hook for components that need to track pinned plans
export function usePinnedPlans() {
  // This could be extended to maintain a global state of pinned plans
  // For now, it's handled within PlanResultsSidebar
  return {};
}