'use client';

import * as React from 'react';

export interface OnboardingAnswers {
  goal: string;
  tool: string;
  project: string;
  audience: string;
  tone: string;
  experience?: string;
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
    if (currentStep < 6) {
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

  const completeOnboarding = () => {
    setIsComplete(true);
    window.location.href = '/?onboarding=complete';
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