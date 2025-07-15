"use client";

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
import { shallow } from 'zustand/shallow';

export function useBrikiChat() {
  const setChatHistory = useProjectStore((state) => state.setChatHistory);
  const setError = useProjectStore((state) => state.setError);
  const clearStoreHistory = useProjectStore((state) => state.clearChatHistory);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error: chatError, setMessages } = useChat({
    api: '/api/ai/chat',
    onFinish: (message) => {
        console.log('🎯 Chat message finished:', message.content?.substring(0, 50) + '...');
    },
    onError: (error) => {
        console.error('❌ Chat error:', error);
    },
  });

  // Sync messages from useChat hook to Zustand store in real-time
  useEffect(() => {
    // Force update the store with the current messages array
    // This ensures real-time updates during streaming
    setChatHistory([...messages]);
    
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
  }

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoading,
    error: chatError,
    clearChat,
  };
} 