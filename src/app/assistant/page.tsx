'use client';

import * as React from 'react';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { AIAssistant } from '@/components/assistant/AIAssistant';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const { answers } = useOnboarding();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);

  // Check for onboarding data with a delay to allow context to load
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!answers.insuranceType || !answers.coverageFor || !answers.budget || !answers.city) {
        console.log('❌ Missing onboarding data, redirecting to onboarding');
        router.push('/onboarding');
      } else {
        console.log('✅ Onboarding data found:', answers);
        setIsLoading(false);
      }
    }, 1000); // Give context time to load

    return () => clearTimeout(timer);
  }, [answers, router]);

  // Show loading while checking data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando asistente...</p>
        </div>
      </div>
    );
  }

  // Only render if we have all the data
  if (!answers.insuranceType || !answers.coverageFor || !answers.budget || !answers.city) {
    return null; // This should not happen due to the useEffect above
  }

  const onboardingData = {
    insuranceType: answers.insuranceType,
    coverageTarget: answers.coverageFor,
    budget: answers.budget,
    city: answers.city,
  };

  return <AIAssistant onboardingData={onboardingData} />;
} 