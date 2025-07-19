'use client';

import * as React from 'react';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { AIAssistant } from '@/components/assistant/AIAssistant';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const { answers, isLoading, currentStep } = useOnboarding();
  const router = useRouter();

  // Always render the AI Assistant, never redirect
  // The AI Assistant component will handle its own loading state
  return <AIAssistant onboardingData={answers} isLoading={isLoading} />;
} 