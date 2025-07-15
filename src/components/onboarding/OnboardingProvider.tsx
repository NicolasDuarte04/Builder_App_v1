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
    if (currentStep <= 4) {
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

  const completeOnboarding = async () => {
    console.log("🚀 completeOnboarding called");
    console.log("📋 Current answers:", answers);
    console.log("📊 All answers present:", {
      insuranceType: !!answers.insuranceType,
      coverageFor: !!answers.coverageFor,
      budget: !!answers.budget,
      city: !!answers.city,
    });
    
    try {
      console.log("🌐 Making API request to /api/onboarding");
      // Save onboarding data to Supabase
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insuranceType: answers.insuranceType,
          coverageTarget: answers.coverageFor,
          budget: answers.budget,
          city: answers.city,
          // userId will be null for anonymous users
          userId: null, // TODO: Add user authentication later
        }),
      });

      if (!response.ok) {
        console.error('❌ Failed to save onboarding session');
        console.error('Response status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      } else {
        const result = await response.json();
        console.log('✅ Onboarding session saved:', result.sessionId);
      }
    } catch (error) {
      console.error('💥 Error saving onboarding session:', error);
    }

    setIsComplete(true);
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