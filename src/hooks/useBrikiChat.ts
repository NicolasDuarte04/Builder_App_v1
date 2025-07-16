"use client";

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
import { shallow } from 'zustand/shallow';

export function useBrikiChat() {
  const setChatHistory = useProjectStore((state) => state.setChatHistory);
  const setError = useProjectStore((state) => state.setError);
  const clearStoreHistory = useProjectStore((state) => state.clearChatHistory);

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

  // Sync messages from useChat hook to Zustand store in real-time
  useEffect(() => {
    // Only update if the new messages are different from the store's history
    const storeHistory = useProjectStore.getState().chatHistory;
    if (messages.length > storeHistory.length) {
      const newMessages = messages.slice(storeHistory.length);
      useProjectStore.getState().appendChatHistory(newMessages);
      
      // Clear tool invocations when a new assistant message is added
      if (newMessages.some(m => m.role === 'assistant')) {
        setCurrentToolInvocations([]);
      }
    } else if (messages.length < storeHistory.length) {
      // Handle message deletion/clearing
      setChatHistory(messages);
    }
    
    // Debug logging to track updates
    console.log('useBrikiChat: Syncing messages to store', {
      messagesLength: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 50) + '...',
      isLoading
    });
  }, [messages, setChatHistory, isLoading]);

  // Handle chat errors
  useEffect(() => {
    if (chatError) {
      console.error('🚨 Chat error detected:', chatError);
      setError(chatError.message);
    }
  }, [chatError, setError]);
  
  const clearChat = () => {
    clearStoreHistory();
    setMessages([]);
  };

  const appendChatHistory = (newMessages: any[]) => {
    setChatHistory([...useProjectStore.getState().chatHistory, ...newMessages]);
  };

  useProjectStore.setState({ appendChatHistory });

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