"use client";

import { useState, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
import { shallow } from 'zustand/shallow';

export function useBrikiChat() {
  const setChatHistory = useProjectStore((state) => state.setChatHistory);
  const setError = useProjectStore((state) => state.setError);
  const clearStoreHistory = useProjectStore((state) => state.clearChatHistory);
  const appendChatHistory = useProjectStore((state) => state.appendChatHistory);

  const [currentToolInvocations, setCurrentToolInvocations] = useState<any[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error: chatError, setMessages } = useChat({
    api: '/api/ai/chat',
    onFinish: (message) => {
        console.log('🎯 Chat message finished:', message.content?.substring(0, 50) + '...');
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
  
  const clearChat = useCallback(() => {
    clearStoreHistory();
    setMessages([]);
    setCurrentToolInvocations([]);
  }, [clearStoreHistory, setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoading,
    error: chatError,
    clearChat,
    toolInvocations: currentToolInvocations,
  };
} 