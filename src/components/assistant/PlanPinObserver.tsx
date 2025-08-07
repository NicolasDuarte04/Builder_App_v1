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
  const lastPinMessageTime = useRef<number>(0);
  const { language } = useTranslation();
  
  // Listen for plan pinned events
  useBrikiEvent('plan-pinned', (event: any) => {
    console.log('📌 Plan pinned:', event);
    
    const currentTime = Date.now();
    
    // Prevent duplicate messages for the same plan
    if (lastPinnedPlanId.current === event.plan.id) {
      console.log('Preventing duplicate pin message for plan:', event.plan.id);
      return;
    }
    
    // Prevent too frequent messages (cooldown of 1 second)
    if (currentTime - lastPinMessageTime.current < 1000) {
      console.log('Preventing too frequent pin messages');
      return;
    }
    
    lastPinnedPlanId.current = event.plan.id;
    lastPinMessageTime.current = currentTime;
    
    // Only send pin message if we have 2+ pinned plans (for comparison context)
    if (event.pinnedCount >= 2) {
      const messages = language === 'en' ? [
        `Ready to compare ${event.pinnedCount} plans.`,
        `${event.pinnedCount} plans pinned for comparison.`,
        `You can now compare ${event.pinnedCount} plans.`
      ] : [
        `Listo para comparar ${event.pinnedCount} planes.`,
        `${event.pinnedCount} planes marcados para comparar.`,
        `Ya puedes comparar ${event.pinnedCount} planes.`
      ];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // Check if we've already sent this exact message recently
      const messageKey = `pin-count-${event.pinnedCount}-${currentTime}`;
      if (!sentMessages.has(messageKey)) {
        sentMessages.add(messageKey);
        
        // Clean up old messages from the set (keep only last 10)
        if (sentMessages.size > 10) {
          const messagesArray = Array.from(sentMessages);
          sentMessages.clear();
          messagesArray.slice(-5).forEach(msg => sentMessages.add(msg));
        }
        
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          appendAssistantMessage(message);
        }, 100);
      }
    }
  });
  
  // Listen for plan unpinned events
  useBrikiEvent('plan-unpinned', (event: any) => {
    console.log('📌 Plan unpinned:', event);
    
    const currentTime = Date.now();
    
    // Prevent duplicate messages for the same plan
    if (lastUnpinnedPlanId.current === event.plan.id) {
      console.log('Preventing duplicate unpin message for plan:', event.plan.id);
      return;
    }
    
    // Prevent too frequent messages (cooldown of 1 second)
    if (currentTime - lastPinMessageTime.current < 1000) {
      console.log('Preventing too frequent unpin messages');
      return;
    }
    
    lastUnpinnedPlanId.current = event.plan.id;
    lastPinMessageTime.current = currentTime;
    
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
      
      const messageKey = `unpin-${event.plan.id}-${currentTime}`;
      if (!sentMessages.has(messageKey)) {
        sentMessages.add(messageKey);
        
        // Clean up old messages from the set (keep only last 10)
        if (sentMessages.size > 10) {
          const messagesArray = Array.from(sentMessages);
          sentMessages.clear();
          messagesArray.slice(-5).forEach(msg => sentMessages.add(msg));
        }
        
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