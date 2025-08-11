"use client";

import { useState, useEffect, useCallback } from 'react';
import { useChat, type Message } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
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

  const customSubmit = async (messages: Message[]) => {
    const url = `/api/ai/chat${process.env.NEXT_PUBLIC_FORCE_NOSTREAM === '1' ? '?nostream=1' : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages, preferredLanguage: language }),
    });

    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('application/json')) {
      const data = await res.json();
      const payload = data?.tools?.insurance_plans;
      if (payload?.plans?.length) {
        eventBus.emit(BrikiEvents.INSURANCE_PLANS_RECEIVED, {
          plans: payload.plans,
          insuranceType: payload.insuranceType,
        });
      }
      // Assuming the assistant's text response is also in the JSON
      if (data.text) {
        // You'll need a way to append this text to your chat messages state
      }
      return; // End of handling for JSON
    }

    // Fallback to streaming if not JSON
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value);
        // This is a simplified stream consumer; you'd integrate with your existing SSE parser
        // For now, let's just log it and assume the useChat hook can take over if we return a stream
        console.log('[ui] raw-chunk', chunk.slice(0, 120));
      }
    }
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading, error: chatError, setMessages } = useChat({
    initialMessages: initialMessages || [],
    body: {
      preferredLanguage: language
    },
    // We're overriding the default submission behavior
    // This is a conceptual change; the actual implementation may need to be more integrated
    // with the `useChat` state management if we don't handle the stream manually.
    // For a quick fix, you might need to handle the stream response and update `messages` state yourself.
    onFinish: (message) => {
        console.log('🎯 Chat message finished:', message.content?.substring(0, 50) + '...');
        if (message.toolInvocations && message.toolInvocations.length > 0) {
            message.toolInvocations.forEach((invocation: any) => {
                if (invocation.toolName === 'get_insurance_plans' && invocation.result) {
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
        setCurrentToolInvocations(prev => [...prev, {
            toolName: toolCall.toolName,
            args: toolCall.args
        }]);
    },
  });

  // The custom handleSubmit would look something like this:
  const customHandleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newMessages: Message[] = [...messages, { id: Date.now().toString(), role: 'user', content: input }];
    setMessages(newMessages);
    customSubmit(newMessages);
    // Clear input, etc.
  };

  useEffect(() => {
    const storeHistory = useProjectStore.getState().chatHistory;
    if (messages.length !== storeHistory.length) {
      setChatHistory(messages);
    }
  }, [messages, setChatHistory]);

  const handleStructuredData = useCallback((data: any) => {
    console.log('🎯 Handling structured data:', data);
    if (!data || !data.plans || data.plans.length === 0) return;

    const eventData = {
      title: 'Planes Recomendados',
      ...data,
    };
    
    eventBus.emit(BrikiEvents.STRUCTURED_DATA_RECEIVED, { type: 'plans', data: eventData });
    eventBus.emit(BrikiEvents.INSURANCE_PLANS_RECEIVED, eventData);

    if (isDualPanelMode) {
      showPanelWithPlans(eventData);
    }
  }, [isDualPanelMode, showPanelWithPlans]);

  const clearChat = useCallback(() => {
    clearStoreHistory();
    setMessages([]);
    setCurrentToolInvocations([]);
  }, [clearStoreHistory, setMessages]);
  
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
    handleSubmit, // You'd return `customHandleSubmit` instead
    isLoading,
    error: chatError,
    clearChat,
    toolInvocations: currentToolInvocations,
    appendAssistantMessage,
  };
} 