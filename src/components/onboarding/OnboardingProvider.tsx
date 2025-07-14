'use client';

import * as React from 'react';

export interface OnboardingAnswers {
  insuranceType: string;
  coverageFor: string;
  budget: string;
  city: string;
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
      // Only load if it's a valid step (1-4)
      if (savedStep >= 1 && savedStep <= 4) {
        setCurrentStep(savedStep);
        setAnswers(savedAnswers || {});
      } else {
        // Reset if invalid state
        localStorage.removeItem('briki-onboarding');
        setCurrentStep(1);
        setAnswers({});
      }
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
    if (currentStep < 4) {
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