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
      console.log('🔄 ComparisonObserver: Received comparison request with data:', eventData);
      
      // Get pinned plans from the event data if available
      const pinnedPlans = eventData?.pinnedPlans || [];
      
      console.log('📌 Pinned plans for comparison:', pinnedPlans);
      
      if (pinnedPlans.length >= 2) {
        console.log('✅ Creating comparison message with', pinnedPlans.length, 'plans');
        
        try {
          // Ensure plans have the correct structure for the comparison component
          const formattedPlans = pinnedPlans.map(plan => ({
            id: plan.id,
            name: plan.name,
            provider: plan.provider,
            basePrice: plan.basePrice || 0,
            currency: plan.currency || 'COP',
            benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
            category: plan.category || 'seguro',
            rating: plan.rating || 4.0,
            is_external: plan.is_external !== undefined ? plan.is_external : true,
            external_link: plan.external_link || null,
            tags: plan.tags || []
          }));

          const comparisonMessage = {
            type: 'comparison',
            plans: formattedPlans,
            timestamp: new Date().toISOString()
          };

          const messageString = JSON.stringify(comparisonMessage);
          console.log('📤 Sending comparison message:', messageString.substring(0, 200) + '...');
          
          // Add the comparison as a special message type
          appendAssistantMessage(messageString);
          
          console.log('✅ Comparison message sent successfully');
        } catch (error) {
          console.error('❌ Error creating comparison message:', error);
          appendAssistantMessage('Error al crear la comparación. Intenta de nuevo.');
        }
      } else {
        console.log('⚠️ Not enough pinned plans for comparison (need 2+, got', pinnedPlans.length, ')');
        
        // Send a helpful message to the user
        const message = pinnedPlans.length === 0 
          ? 'Necesitas marcar al menos 2 planes para poder compararlos. Marca algunos planes primero y luego intenta de nuevo.'
          : `Solo tienes ${pinnedPlans.length} plan marcado. Necesitas marcar al menos 2 planes para comparar.`;
        
        appendAssistantMessage(message);
      }
    };

    // Listen for comparison requests and keep the unsubscribe to avoid removing other listeners
    const unsubscribe = eventBus.on('comparison:request', handleComparisonRequest);

    return () => {
      // Properly unsubscribe only this handler
      unsubscribe();
    };
  }, [appendAssistantMessage, currentResults]);

  return null;
}
