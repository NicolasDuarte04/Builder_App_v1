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
  isLoading: boolean; // Add loading state
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
  const [isLoading, setIsLoading] = React.useState(true); // Add loading state

  // Load state from localStorage on mount
  React.useEffect(() => {
    const savedState = localStorage.getItem('briki-onboarding');
    
    if (savedState) {
      try {
        const { currentStep: savedStep, answers: savedAnswers } = JSON.parse(savedState);
        
        // Only load if it's a valid step (1-5, where 5 means completed)
        if (savedStep >= 1 && savedStep <= 5) {
          setCurrentStep(savedStep);
          setAnswers(savedAnswers || {});
        } else {
          localStorage.removeItem('briki-onboarding');
          setCurrentStep(1);
          setAnswers({});
        }
      } catch (error) {
        localStorage.removeItem('briki-onboarding');
        setCurrentStep(1);
        setAnswers({});
      }
    } else {
      // No saved state, clear any stale data
      localStorage.removeItem('briki-onboarding');
    }
    setIsLoading(false); // Mark as loaded
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

  const completeOnboarding = React.useCallback(async () => {
    
    // Ensure all answers are present before proceeding
    if (!answers.insuranceType || !answers.coverageFor || !answers.budget || !answers.city) {
      // Don't return, just log the warning and continue
      // This allows the function to be called multiple times safely
    }

    // Only proceed if all answers are present
    if (!answers.insuranceType || !answers.coverageFor || !answers.budget || !answers.city) {
      console.log('⏳ Waiting for all answers to be present...');
      return;
    }

    // Force save to localStorage immediately and synchronously
    const finalState = {
      currentStep: 5, // Mark as completed
      answers: answers,
    };
    
    try {
      localStorage.setItem('briki-onboarding', JSON.stringify(finalState));
      
      // Verify the save worked
      const saved = localStorage.getItem('briki-onboarding');
    } catch (error) {
      console.error('💥 Error saving to localStorage:', error);
    }
    
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

    console.log('✅ Setting isComplete to true and redirecting to /assistant');
    setIsComplete(true);
    
    // Add a small delay to ensure localStorage is saved and state is updated
    setTimeout(() => {
      console.log('🔄 Redirecting to /assistant...');
      window.location.href = '/assistant';
    }, 200);
  }, [answers]);

  // Watch for when all answers are complete and we're on the final step
  React.useEffect(() => {
    const allAnswersPresent = answers.insuranceType && answers.coverageFor && answers.budget && answers.city;
    const isFinalStep = currentStep === 4;
    
    if (allAnswersPresent && isFinalStep) {
      // Use a small delay to ensure state is fully updated
      setTimeout(() => {
        completeOnboarding();
      }, 100);
    }
  }, [answers, currentStep, completeOnboarding]);

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

  const value: OnboardingContextType = {
    currentStep,
    answers,
    isComplete,
    isLoading, // Include loading state
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