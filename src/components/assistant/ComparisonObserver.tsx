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
    const handleComparisonRequest = () => {
      if (!currentResults?.plans) return;

      // Get the actual pinned plans from the current results
      // For now, we'll use the first 2 plans as "pinned" for demonstration
      const pinnedPlans = currentResults.plans.slice(0, 2); // Take first 2 plans

      if (pinnedPlans.length >= 2) {
        console.log('🔄 ComparisonObserver: Creating comparison message with plans:', pinnedPlans);
        
        const comparisonMessage = {
          type: 'comparison',
          plans: pinnedPlans,
          timestamp: new Date().toISOString()
        };

        // Add the comparison as a special message type
        appendAssistantMessage(JSON.stringify(comparisonMessage));
      } else {
        console.log('⚠️ ComparisonObserver: Not enough plans for comparison (need 2+, got', pinnedPlans.length, ')');
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
