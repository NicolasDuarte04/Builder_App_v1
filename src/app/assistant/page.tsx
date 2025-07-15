'use client';

import * as React from 'react';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { AIAssistant } from '@/components/assistant/AIAssistant';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const { answers } = useOnboarding();
  const router = useRouter();

  // Redirect if no onboarding data
  React.useEffect(() => {
    if (!answers.insuranceType || !answers.coverageFor || !answers.budget || !answers.city) {
      router.push('/onboarding');
    }
  }, [answers, router]);

  // Show loading while checking data
  if (!answers.insuranceType || !answers.coverageFor || !answers.budget || !answers.city) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando asistente...</p>
        </div>
      </div>
    );
  }

  const onboardingData = {
    insuranceType: answers.insuranceType,
    coverageTarget: answers.coverageFor,
    budget: answers.budget,
    city: answers.city,
  };

  return <AIAssistant onboardingData={onboardingData} />;
} 