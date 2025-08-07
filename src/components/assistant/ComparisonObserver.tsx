"use client";

import { useEffect } from 'react';
import { eventBus } from '@/lib/event-bus';
import { usePlanResults } from '@/contexts/PlanResultsContext';

interface ComparisonObserverProps {
  appendAssistantMessage: (content: string) => void;
}

export function ComparisonObserver({ appendAssistantMessage }: ComparisonObserverProps) {
  const { currentResults } = usePlanResults();

  useEffect(() => {
    const handleComparisonRequest = (eventData?: any) => {
      // Get pinned plans from the event data if available
      const pinnedPlans = eventData?.pinnedPlans || [];
      
      if (pinnedPlans.length >= 2) {
        console.log('🔄 ComparisonObserver: Creating comparison message with pinned plans:', pinnedPlans);
        
        const comparisonMessage = {
          type: 'comparison',
          plans: pinnedPlans,
          timestamp: new Date().toISOString()
        };

        // Add the comparison as a special message type
        appendAssistantMessage(JSON.stringify(comparisonMessage));
      } else {
        console.log('⚠️ ComparisonObserver: Not enough pinned plans for comparison (need 2+, got', pinnedPlans.length, ')');
        
        // Send a helpful message to the user
        const message = 'Necesitas marcar al menos 2 planes para poder compararlos. Marca algunos planes primero y luego intenta de nuevo.';
        appendAssistantMessage(message);
      }
    };

    // Listen for comparison requests
    eventBus.on('comparison:request', handleComparisonRequest);

    return () => {
      eventBus.off('comparison:request', handleComparisonRequest);
    };
  }, [appendAssistantMessage, currentResults]);

  return null;
}
