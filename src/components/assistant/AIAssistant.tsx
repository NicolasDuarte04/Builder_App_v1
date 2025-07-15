'use client';

import * as React from 'react';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { AIAssistantInterface } from './AIAssistantInterface';

interface AIAssistantProps {
  onboardingData: Partial<{
    insuranceType: string;
    coverageFor: string;
    budget: string;
    city: string;
  }>;
  isLoading?: boolean;
}

export function AIAssistant({ onboardingData, isLoading = false }: AIAssistantProps) {
  // Log the onboarding data for debugging
  console.log('🎯 AI Assistant initialized with:', {
    onboardingData,
    isLoading,
    hasData: Object.keys(onboardingData).length > 0
  });

  return (
    <div className="min-h-screen">
      <AIAssistantInterface isLoading={isLoading} />
    </div>
  );
} 