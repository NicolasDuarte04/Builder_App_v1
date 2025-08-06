"use client";

import { useEffect, useRef } from 'react';
import { useBrikiEvent, eventBus } from '@/lib/event-bus';

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
  
  // Listen for plan pinned events
  useBrikiEvent('plan-pinned', (event: any) => {
    console.log('📌 Plan pinned:', event);
    
    // Prevent duplicate messages for the same plan
    if (lastPinnedPlanId.current === event.plan.id) {
      console.log('Preventing duplicate pin message for plan:', event.plan.id);
      return;
    }
    
    lastPinnedPlanId.current = event.plan.id;
    
    // Short, varied messages
    const messages = [
      `Marcaste "${event.plan.name}".`,
      `Plan fijado: "${event.plan.name}".`,
      `Guardado: "${event.plan.name}".`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    // Check if we've already sent this exact message
    const messageKey = `pin-${event.plan.id}`;
    if (!sentMessages.has(messageKey)) {
      sentMessages.add(messageKey);
      appendAssistantMessage(message);
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
      const messages = [
        `Desmarcado.`,
        `Quitado.`,
        `Liberado.`
      ];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      const messageKey = `unpin-${event.plan.id}`;
      if (!sentMessages.has(messageKey)) {
        sentMessages.add(messageKey);
        appendAssistantMessage(message);
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