"use client";

import { useState, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
import { shallow } from 'zustand/shallow';
import { eventBus } from '@/lib/event-bus';
import { usePlanResults } from '@/contexts/PlanResultsContext';
import { useLanguage } from '@/components/LanguageProvider';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { useBriefStore } from '@/state/briefStore';

export function useBrikiChat(initialMessages?: any[]) {
  const setChatHistory = useProjectStore((state) => state.setChatHistory);
  const setError = useProjectStore((state) => state.setError);
  const clearStoreHistory = useProjectStore((state) => state.clearChatHistory);
  const appendChatHistory = useProjectStore((state) => state.appendChatHistory);
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();
  const { language } = useLanguage();

  const [currentToolInvocations, setCurrentToolInvocations] = useState<any[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error: chatError, setMessages } = useChat({
    api: '/api/ai/chat',
    initialMessages: initialMessages || [],
    body: {
      preferredLanguage: language, // Pass the navbar language preference
      clientBrief: useBriefStore.getState().brief
    },
    onFinish: (message) => {
        console.log('🎯 Chat message finished:', message.content?.substring(0, 50) + '...');
        
        // Check if message contains structured data
        if (message.toolInvocations && message.toolInvocations.length > 0) {
            message.toolInvocations.forEach((invocation: any) => {
                if (invocation.toolName === 'get_insurance_plans' && invocation.result) {
                    const result = invocation.result;

                    // Handle smart templates (fallback when no catalog plans)
                    if (result?.type === 'templates' || result?.type === 'insurance_templates') {
                        try {
                          const templateData = {
                            type: 'templates',
                            items: Array.isArray(result.templates) ? result.templates : [],
                            insuranceType: result.insuranceType || result.category || undefined,
                            title: result.title || 'Plantillas Sugeridas',
                            hasRealPlans: false,
                            isExactMatch: result.isExactMatch,
                            noExactMatchesFound: result.noExactMatchesFound,
                            dataSource: result.dataSource || 'templates'
                          };
                          
                          // Generate a requestId once to reuse in audit + UI injection
                          const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

                          // [AUDIT] Chat finish: templates received
                          console.log('[AUDIT] Chat finish: templates received', {
                            count: templateData.items.length,
                            category: templateData.insuranceType,
                            requestId
                          });
                          
                          // Guard against double-render during streaming
                          if (streamingMessageId) {
                            console.log('🚫 Skipping duplicate template render during streaming');
                            return;
                          }
                          setStreamingMessageId(`template-data-${Date.now()}`);
                          
                          // Push templates directly to the right panel (no chat bubble),
                          // passing context info
                          showPanelWithPlans({
                            title: templateData.title,
                            plans: [],
                            templates: templateData.items,
                            category: templateData.insuranceType,
                            hasRealPlans: false,
                            isExactMatch: templateData.isExactMatch,
                            noExactMatchesFound: templateData.noExactMatchesFound,
                            dataSource: templateData.dataSource,
                            requestId,
                            source: 'chat_tool',
                          });
                          
                          // Emit structured data event for templates
                          const structuredTemplateData = {
                            type: 'templates' as const,
                            data: {
                              title: templateData.title,
                              templates: templateData.items,
                              category: templateData.insuranceType,
                              hasRealPlans: false,
                              isExactMatch: templateData.isExactMatch,
                              noExactMatchesFound: templateData.noExactMatchesFound,
                              dataSource: templateData.dataSource,
                            },
                            metadata: {
                              timestamp: new Date(),
                              source: 'chat',
                              query: result.query,
                            }
                          };
                          
                          // Emit via event bus for any listeners (non-rendering)
                          eventBus.emit('STRUCTURED_DATA_RECEIVED', structuredTemplateData);
                          eventBus.emit('INSURANCE_TEMPLATES_RECEIVED', structuredTemplateData.data);
                          
                          // Already pushed to panel above; no chat bubble rendering
                          
                          // Note: TEMPLATES_GENERATED telemetry is now handled in showPanelWithPlans
                          
                          // Clear streaming guard after a short delay
                          setTimeout(() => setStreamingMessageId(null), 1000);
                          
                        } catch (e) {
                          console.warn('⚠️ Failed to append templates structured message', e);
                        }
                        return; // Do not emit plans UI in this case
                    }

                    // Pre-check for category mismatch before handling
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
        try {
          console.error('❌ Chat error:', error);
          setError(error?.message || 'Something went wrong. Please try again.');
          // Optionally append a friendly assistant message
          setMessages((prev) => ([
            ...prev,
            {
              id: `assistant-error-${Date.now()}`,
              role: 'assistant' as const,
              content: 'I ran into an issue while responding. Please try again.',
            },
          ]));
        } catch {}
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
          // Also clear streaming guard
          setStreamingMessageId(null);
        }
      } else {
        // Handle message deletion/clearing
        setChatHistory(messages);
      }
    }
  }, [messages, setChatHistory, appendChatHistory]);

  // Handle chat errors (non-fatal)
  useEffect(() => {
    if (chatError) {
      try {
        console.error('🚨 Chat error detected:', chatError);
        setError(chatError.message || 'Something went wrong. Please try again.');
      } catch {}
    }
  }, [chatError, setError]);
  
  // Handle structured data from tool invocations
  const handleStructuredData = useCallback((data: any) => {
    console.log('🎯 GEMINI-STYLE: Handling structured data:', data);
    
    // Global streaming guard to prevent duplicate processing
    if (streamingMessageId) {
      console.log('🚫 Skipping duplicate structured data processing during streaming');
      return;
    }
    setStreamingMessageId(`structured-data-${Date.now()}`);
    
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

    // Build UI plans: allow priced OR quote-only with a valid external link
    const uiPlans = (data?.plans ?? [])
      .filter((p: any) =>
        p &&
        p.name &&
        p.provider &&
        (Number(p.base_price) > 0 || !!p.external_link)
      )
      .map((p: any, index: number) => {
        const basePriceNum =
          typeof p.base_price === 'string' ? Number(p.base_price) : (p.base_price ?? 0);
        const isQuote = !basePriceNum || basePriceNum === 0;

        return {
          id: p.id ?? index,
          name: p.name || 'Plan de Seguro',
          provider: p.provider || 'Proveedor',
          basePrice: basePriceNum,
          currency: p.currency || 'COP',
          benefits: Array.isArray(p.benefits) ? p.benefits : [],
          external_link: p.external_link ?? p.brochure_link ?? null,
          is_external: p.is_external !== undefined ? p.is_external : true,
          category: p.category || 'seguro',
          rating: typeof p.rating === 'string' ? parseFloat(p.rating) : (p.rating || 4.0),
          tags: Array.isArray(p.tags) ? p.tags : [],
          isQuote,
          ctaLabel: isQuote ? 'Cotizar ahora' : 'Comprar',
        };
      });

    console.log('[plan-cards] mapped', {
      apiCount: data?.plans?.length ?? 0,
      uiCount: uiPlans.length,
    });

    if (uiPlans.length === 0) return;

    // Prepare structured data event
    const structuredData = {
      type: 'plans' as const,
      data: {
        title: data.title || 'Planes Recomendados',
        plans: uiPlans,
        category: data.insuranceType || data.category,
        hasRealPlans: data.hasRealPlans,
        isExactMatch: data.isExactMatch,
        noExactMatchesFound: data.noExactMatchesFound,
        filters: data.filters,
        dataSource: data.dataSource,
      },
      metadata: {
        timestamp: new Date(),
        source: 'chat',
        query: data.query,
      }
    };

    // Emit via event bus (for any listeners)
    eventBus.emit('STRUCTURED_DATA_RECEIVED', structuredData);
    eventBus.emit('INSURANCE_PLANS_RECEIVED', structuredData.data);

    // Always push to the right panel; no chat bubble rendering
    showPanelWithPlans(structuredData.data);
  }, [isDualPanelMode, showPanelWithPlans, streamingMessageId, setStreamingMessageId]);

  const clearChat = useCallback(() => {
    clearStoreHistory();
    setMessages([]);
    setCurrentToolInvocations([]);
    setStreamingMessageId(null);
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
    setMessages,
  };
} 