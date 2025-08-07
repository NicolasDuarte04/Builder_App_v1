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

      // For now, we'll use all plans as "pinned" for demonstration
      // In a real implementation, you'd track which plans are actually pinned
      const pinnedPlans = currentResults.plans.slice(0, 3); // Take first 3 plans

      if (pinnedPlans.length >= 2) {
        const comparisonMessage = {
          type: 'comparison',
          plans: pinnedPlans,
          timestamp: new Date().toISOString()
        };

        // Add the comparison as a special message type
        appendAssistantMessage(JSON.stringify(comparisonMessage));
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
