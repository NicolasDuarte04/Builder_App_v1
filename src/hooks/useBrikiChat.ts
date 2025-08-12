"use client";

import { useState, useEffect, useCallback } from 'react';
import { useChat, type Message } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
import { eventBus, BrikiEvents } from '@/lib/event-bus';
import { usePlanResults } from '@/contexts/PlanResultsContext';
import { KNOWN_CATEGORIES } from '@/lib/insuranceCategories';
import { useLanguage } from '@/components/LanguageProvider';

// Chat endpoint (can be overridden via env)
const CHAT_API = (process.env.NEXT_PUBLIC_CHAT_API_URL || '/api/ai/chat').trim();

export function useBrikiChat(initialMessages?: any[]) {
  const setChatHistory = useProjectStore((state) => state.setChatHistory);
  const setError = useProjectStore((state) => state.setError);
  const clearStoreHistory = useProjectStore((state) => state.clearChatHistory);
  const appendChatHistory = useProjectStore((state) => state.appendChatHistory);
  const { showPanelWithPlans, isDualPanelMode } = usePlanResults();
  const { language } = useLanguage();
  
  const [currentToolInvocations, setCurrentToolInvocations] = useState<any[]>([]);

  const customSubmit = async (messagesPayload: Message[]) => {
    const url = `${CHAT_API}${process.env.NEXT_PUBLIC_FORCE_NOSTREAM === '1' ? '?nostream=1' : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: messagesPayload, preferredLanguage: language }),
    });

    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('application/json')) {
      const data = await res.json();
      // Assistant reply text (if provided)
      if (data.assistant) {
        appendAssistantMessage(data.assistant);
      }

      // Tool payload (plans)
      const payload = data?.tools?.insurance_plans;
      const isValid = payload?.plans?.length && payload.insuranceType && KNOWN_CATEGORIES.has(payload.insuranceType);
      if (isValid) {
        eventBus.emit(BrikiEvents.INSURANCE_PLANS_RECEIVED, {
          plans: payload.plans,
          insuranceType: payload.insuranceType,
        });
        handleStructuredData({
          plans: payload.plans,
          insuranceType: payload.insuranceType,
        });
      }
      return; // handled JSON path
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

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: _sdkHandleSubmit,
    isLoading,
    error: chatError,
    setMessages,
    setInput, // <-- Import setInput
    append, // <-- Import append
  } = useChat({
    api: CHAT_API,
    initialMessages: initialMessages || [],
    body: { preferredLanguage: language },
    onFinish: message => {
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
        setCurrentToolInvocations(prev => [...prev, { toolName: toolCall.toolName, args: toolCall.args }]);
    },
  });

  // The custom handleSubmit clears the input and calls the nostream endpoint
  const customHandleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;

    // Clear right away for responsive UX
    setInput('');

    const userMessage: Message = { role: 'user', content: prompt, id: Date.now().toString() };
    append(userMessage);

    const messagesPayload: Message[] = [...messages, userMessage];

    try {
      await customSubmit(messagesPayload);
    } catch (error) {
      console.error('❌ Fetch error in custom submit:', error);
      // Optional: Restore input on hard failure
      setInput(prompt);
    }
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
    handleSubmit: customHandleSubmit,
    isLoading,
    error: chatError,
    clearChat,
    toolInvocations: currentToolInvocations,
    appendAssistantMessage,
  };
} 