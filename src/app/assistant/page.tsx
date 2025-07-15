'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AssistantInterface } from '@/components/assistant/AssistantInterface';

interface OnboardingSession {
  id: string;
  insurance_type: string;
  coverage_target: string;
  budget: string;
  city: string;
  created_at: string;
}

export default function AssistantPage() {
  const [onboardingData, setOnboardingData] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session');

  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        // If we have a session ID, fetch the specific session
        if (sessionId) {
          const response = await fetch(`/api/onboarding?sessionId=${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            setOnboardingData(data.session);
          }
        } else {
          // Try to get the latest session for the user
          const response = await fetch('/api/onboarding');
          if (response.ok) {
            const data = await response.json();
            if (data.sessions && data.sessions.length > 0) {
              setOnboardingData(data.sessions[0]); // Get the most recent session
            }
          }
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tu información personalizada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AssistantInterface onboardingData={onboardingData} />
    </div>
  );
} 