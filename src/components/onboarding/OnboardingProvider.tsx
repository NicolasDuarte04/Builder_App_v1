'use client';

import * as React from 'react';

export interface OnboardingAnswers {
  insuranceType: string;
  age: string;
  familyStatus: string;
  location: string;
  budget: string;
  currentInsurance: string;
  priority: string;
  email: string;
}

interface OnboardingContextType {
  currentStep: number;
  answers: Partial<OnboardingAnswers>;
  isComplete: boolean;
  setCurrentStep: (step: number) => void;
  setAnswer: (key: keyof OnboardingAnswers, value: string) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  saveToSupabase: () => Promise<void>;
}

const OnboardingContext = React.createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [answers, setAnswers] = React.useState<Partial<OnboardingAnswers>>({});
  const [isComplete, setIsComplete] = React.useState(false);

  // Load state from localStorage on mount
  React.useEffect(() => {
    const savedState = localStorage.getItem('briki-onboarding');
    if (savedState) {
      const { currentStep: savedStep, answers: savedAnswers } = JSON.parse(savedState);
      setCurrentStep(savedStep || 1);
      setAnswers(savedAnswers || {});
    }
  }, []);

  // Save state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('briki-onboarding', JSON.stringify({
      currentStep,
      answers,
    }));
  }, [currentStep, answers]);

  const setAnswer = (key: keyof OnboardingAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const goToNext = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    localStorage.removeItem('briki-onboarding');
    window.location.href = '/';
  };

  const saveToSupabase = async () => {
    try {
      // Save onboarding data to Supabase
      const response = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        console.error('Failed to save onboarding data');
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const completeOnboarding = async () => {
    setIsComplete(true);
    
    // Save to Supabase
    await saveToSupabase();
    
    // Store answers in sessionStorage for the assistant to use
    sessionStorage.setItem('briki-insurance-context', JSON.stringify(answers));
    
    // Clear onboarding localStorage
    localStorage.removeItem('briki-onboarding');
    
    // Redirect to assistant with context
    window.location.href = '/assistant';
  };

  const value: OnboardingContextType = {
    currentStep,
    answers,
    isComplete,
    setCurrentStep,
    setAnswer,
    goToNext,
    goToPrevious,
    skipOnboarding,
    completeOnboarding,
    saveToSupabase,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = React.useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
} 