"use client";

import { useState, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
import { shallow } from 'zustand/shallow';
import { eventBus, BrikiEvents } from '@/lib/event-bus';
import { usePlanResults } from '@/contexts/PlanResultsContext';
import { useLanguage } from '@/components/LanguageProvider';

export function useBrikiChat(initialMessages?: any[]) {
  const setChatHistory = useProjectStore((state) => state.setChatHistory);
  const setError = useProjectStore((state) => state.setError);
  const clearStoreHistory = useProjectStore((state) => state.clearChatHistory);
  const appendChatHistory = useProjectStore((state) => state.appendChatHistory);
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();
  const { language } = useLanguage();

  const [currentToolInvocations, setCurrentToolInvocations] = useState<any[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error: chatError, setMessages } = useChat({
    api: '/api/ai/chat',
    initialMessages: initialMessages || [],
    body: {
      preferredLanguage: language // Pass the navbar language preference
    },
    onFinish: (message) => {
        console.log('🎯 Chat message finished:', message.content?.substring(0, 50) + '...');
        
        // Check if message contains structured data
        if (message.toolInvocations && message.toolInvocations.length > 0) {
            message.toolInvocations.forEach((invocation: any) => {
                if (invocation.toolName === 'get_insurance_plans' && invocation.result) {
                    // Pre-check for category mismatch before handling
                    const result = invocation.result;
                    const isCategoryMismatch = result.noExactMatchesFound && 
                                               result.insuranceType && 
                                               result.categoriesFound && 
                                               !result.categoriesFound.includes(result.insuranceType);
                    
                    if (isCategoryMismatch) {
                        console.log('🚫 Blocking irrelevant plans from being shown');
                        // Emit event but don't process plans
                        eventBus.emit('insurance-category-not-found', {
                            requestedCategory: result.insuranceType,
                            availableCategories: ['auto', 'salud', 'vida', 'hogar', 'viaje', 'empresarial', 'educacion']
                        });
                        return; // Don't call handleStructuredData
                    }
                    
                    handleStructuredData(invocation.result);
                }
            });
        }
    },
    onError: (error) => {
        console.error('❌ Chat error:', error);
    },
    onToolCall: ({ toolCall }) => {
        console.log('🛠️ Tool call detected:', {
            toolName: toolCall.toolName,
            args: toolCall.args
        });
        
        // Store tool invocation for the current message
        setCurrentToolInvocations(prev => [...prev, {
            toolName: toolCall.toolName,
            args: toolCall.args
        }]);
    },
  });

  // Optimized message sync with proper dependency management
  useEffect(() => {
    const storeHistory = useProjectStore.getState().chatHistory;
    
    // Only update if there's an actual difference in message count
    if (messages.length !== storeHistory.length) {
      if (messages.length > storeHistory.length) {
        // Add only new messages
        const newMessages = messages.slice(storeHistory.length);
        appendChatHistory(newMessages);
        
        // Clear tool invocations when a new assistant message is added
        if (newMessages.some(m => m.role === 'assistant')) {
          setCurrentToolInvocations([]);
        }
      } else {
        // Handle message deletion/clearing
        setChatHistory(messages);
      }
    }
  }, [messages, setChatHistory, appendChatHistory]);

  // Handle chat errors
  useEffect(() => {
    if (chatError) {
      console.error('🚨 Chat error detected:', chatError);
      setError(chatError.message);
    }
  }, [chatError, setError]);
  
  // Handle structured data from tool invocations
  const handleStructuredData = useCallback((data: any) => {
    console.log('🎯 GEMINI-STYLE: Handling structured data:', data);
    
    if (!data || !data.plans) return;

    // Check if this is a fallback result (requested category doesn't match returned categories)
    const isIrrelevantFallback = data.noExactMatchesFound && 
                                  data.insuranceType && 
                                  data.categoriesFound && 
                                  !data.categoriesFound.includes(data.insuranceType);

    // If results are irrelevant, don't show plans panel
    if (isIrrelevantFallback) {
      console.log('⚠️ Detected irrelevant fallback results:', {
        requested: data.insuranceType,
        found: data.categoriesFound
      });
      
      // Emit a special event for the assistant to handle
      eventBus.emit('insurance-category-not-found', {
        requestedCategory: data.insuranceType,
        availableCategories: ['auto', 'salud', 'vida', 'hogar', 'viaje', 'empresarial', 'educacion']
      });
      
      return; // Don't show the panel
    }

    // Validate and filter plans
    const validPlans = data.plans.filter((plan: any) => 
      plan && 
      plan.name && 
      plan.name !== 'No hay planes disponibles públicamente' &&
      plan.provider &&
      plan.base_price > 0
    );

    if (validPlans.length === 0) return;

    // Map plans to the expected format
    const mappedPlans = validPlans.map((plan: any, index: number) => ({
      id: plan.id ?? index,
      name: plan.name || 'Plan de Seguro',
      provider: plan.provider || 'Proveedor',
      basePrice: plan.base_price || 0,
      currency: plan.currency || 'COP',
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
      externalLink: plan.external_link,
      external_link: plan.external_link,
      is_external: plan.is_external !== undefined ? plan.is_external : true,
      category: plan.category || 'seguro',
      rating: parseFloat(plan.rating) || 4.0,
      tags: Array.isArray(plan.tags) ? plan.tags : [],
    }));

    // Prepare structured data event
    const structuredData = {
      type: 'plans' as const,
      data: {
        title: data.title || 'Planes Recomendados',
        plans: mappedPlans,
        category: data.insuranceType || data.category,
        hasRealPlans: data.hasRealPlans,
        isExactMatch: data.isExactMatch,
        noExactMatchesFound: data.noExactMatchesFound,
      },
      metadata: {
        timestamp: new Date(),
        source: 'chat',
        query: data.query,
      }
    };

    // Emit via event bus (for any listeners)
    eventBus.emit(BrikiEvents.STRUCTURED_DATA_RECEIVED, structuredData);
    eventBus.emit(BrikiEvents.INSURANCE_PLANS_RECEIVED, structuredData.data);

    // Also emit directly to context if in dual panel mode
    if (isDualPanelMode) {
      showPanelWithPlans(structuredData.data);
    }
  }, [isDualPanelMode, showPanelWithPlans]);

  const clearChat = useCallback(() => {
    clearStoreHistory();
    setMessages([]);
    setCurrentToolInvocations([]);
  }, [clearStoreHistory, setMessages]);

  // Add assistant message programmatically
  const appendAssistantMessage = useCallback((content: string) => {
    const newMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const,
      content,
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
  }, [setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoading,
    error: chatError,
    clearChat,
    toolInvocations: currentToolInvocations,
    appendAssistantMessage,
  };
} 