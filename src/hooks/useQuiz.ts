'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface QuizResult {
  id: string;
  user_id: string;
  persona: string;
  completed_at: string;
}

export function useQuiz() {
  const [userPersona, setUserPersona] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user's quiz result on mount
  useEffect(() => {
    loadUserQuizResult();
  }, []);

  const loadUserQuizResult = async () => {
    try {
      // For now, we'll just set loading to false since we don't have Supabase configured
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading quiz result:', error);
      setIsLoading(false);
    }
  };

  const startQuiz = () => {
    router.push('/quiz');
  };

  const hasCompletedQuiz = () => {
    return userPersona !== null;
  };

  const getUserPersona = () => {
    return userPersona;
  };

  return {
    userPersona,
    isLoading,
    startQuiz,
    hasCompletedQuiz,
    getUserPersona,
    loadUserQuizResult,
  };
} 