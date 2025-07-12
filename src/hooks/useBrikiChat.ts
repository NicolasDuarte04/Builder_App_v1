"use client";

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { useProjectStore } from '@/store/useProjectStore';
import { Message } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { transformOpenAIToRoadmap } from '@/lib/roadmap-transformer';
import { shallow } from 'zustand/shallow';

export function useBrikiChat() {
  const setChatHistory = useProjectStore((state) => state.setChatHistory);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const setIsGenerating = useProjectStore((state) => state.setIsGenerating);
  const setError = useProjectStore((state) => state.setError);
  const addMessage = useProjectStore((state) => state.addMessage);
  const clearStoreHistory = useProjectStore((state) => state.clearChatHistory);

  const [roadmapToolCall, setRoadmapToolCall] = useState<{ projectName: string; projectDescription: string } | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error: chatError, setMessages, append } = useChat({
    api: '/api/ai/chat',
    onFinish: (message) => {
        // The 'messages' array from the hook is already updated when onFinish is called.
        // The useEffect below handles syncing with the Zustand store.
        // Calling addMessage here would add the message a second time.
    },
    async onToolCall({ toolCall }: { toolCall: { toolName: string; args: any } }) {
      if (toolCall.toolName === 'create_roadmap') {
        // Don't execute the tool here.
        // Instead, save its arguments to state so the UI can react.
        setRoadmapToolCall(toolCall.args);
        // The UI will now show a button to trigger `generateRoadmap`.
        // We don't need to return a result here as the user will trigger the next step.
        return;
      }
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
      setError(chatError.message);
    }
  }, [chatError, setError]);

  const generateRoadmap = async () => {
    if (!roadmapToolCall) return;

    setIsGenerating(true);
    setError(null);
    const { projectName, projectDescription } = roadmapToolCall;
    
    // Add a message to the chat to inform the user that generation has started
    const generatingMessage: Message = { id: uuidv4(), role: 'assistant', content: `Creating a roadmap for: **${projectName}**. Please wait...` };
    append(generatingMessage);

    const fullPrompt = `Create a roadmap for: ${projectName}. Description: ${projectDescription}.`;

    try {
      const response = await fetch('/api/ai/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate roadmap from API');
      }

      const data = await response.json();
      const parsed = JSON.parse(data.roadmap ?? '{}');
      
      const transformedPhases = transformOpenAIToRoadmap(parsed.phases);

      const newProject = {
        id: uuidv4(),
        title: projectName || parsed.title,
        description: projectDescription || parsed.description,
        complexity: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        roadmap: transformedPhases,
      };

      setCurrentProject(newProject);
      setRoadmapToolCall(null); // Clear tool call after successful generation
       
      const successMessage: Message = { id: uuidv4(), role: 'assistant', content: `The roadmap for "${projectName}" has been successfully generated! You can now see the visual map and checklist below.` };
      append(successMessage);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
       
      const errorMessageObj: Message = { id: uuidv4(), role: 'assistant', content: `I'm sorry, I encountered an error while generating the roadmap: ${errorMessage}` };
      append(errorMessageObj);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const clearChat = () => {
    clearStoreHistory();
    setMessages([]);
    setRoadmapToolCall(null);
  }

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoading,
    error: chatError,
    generateRoadmap,
    isRoadmapReady: roadmapToolCall !== null,
    roadmapGenerationData: roadmapToolCall,
    clearChat,
  };
} 