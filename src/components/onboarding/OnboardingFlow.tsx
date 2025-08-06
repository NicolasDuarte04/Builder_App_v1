'use client';

import * as React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { QuestionCard } from './QuestionCard';
import { ProgressBar } from './ProgressBar';
import { CompletionScreen } from './CompletionScreen';
import { useQuiz } from '@/hooks/useQuiz';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { useTranslation } from '@/hooks/useTranslation';

export function OnboardingFlow() {
  const { currentStep, goToNext, goToPrevious, skipOnboarding, setAnswer, completeOnboarding } = useOnboarding();
  const { startQuiz, hasCompletedQuiz, getUserPersona } = useQuiz();
  const { t, language } = useTranslation();

  const questions = [
    {
      id: 1,
      question: t("onboarding.questions.insuranceType"),
      options: [
        { value: "health", label: t("onboarding.options.health.label"), description: t("onboarding.options.health.description") },
        { value: "life", label: t("onboarding.options.life.label"), description: t("onboarding.options.life.description") },
        { value: "auto", label: t("onboarding.options.auto.label"), description: t("onboarding.options.auto.description") },
        { value: "home", label: t("onboarding.options.home.label"), description: t("onboarding.options.home.description") },
        { value: "travel", label: t("onboarding.options.travel.label"), description: t("onboarding.options.travel.description") },
        { value: "business", label: t("onboarding.options.business.label"), description: t("onboarding.options.business.description") },
        { value: "unsure", label: t("onboarding.options.unsure.label"), description: t("onboarding.options.unsure.description") }
      ]
    },
    {
      id: 2,
      question: t("onboarding.questions.coverageFor"),
      options: [
        { value: "me", label: t("onboarding.options.me.label"), description: t("onboarding.options.me.description") },
        { value: "couple", label: t("onboarding.options.couple.label"), description: t("onboarding.options.couple.description") },
        { value: "family", label: t("onboarding.options.family.label"), description: t("onboarding.options.family.description") },
        { value: "business", label: t("onboarding.options.business_coverage.label"), description: t("onboarding.options.business_coverage.description") }
      ]
    },
    {
      id: 3,
      question: t("onboarding.questions.budget"),
      options: language === 'en' ? [
        { value: "under_50k", label: "💰 Less than $12 USD", description: "Basic budget (~$50,000 COP/month)" },
        { value: "50k_to_100k", label: "💵 $12 to $25 USD", description: "Medium budget (~$50k-100k COP/month)" },
        { value: "over_100k", label: "💎 More than $25 USD", description: "Premium budget (~$100k+ COP/month)" },
        { value: "unsure", label: t("onboarding.options.unsure_budget.label"), description: t("onboarding.options.unsure_budget.description") }
      ] : [
        { value: "under_50k", label: t("onboarding.options.under_50k.label"), description: t("onboarding.options.under_50k.description") },
        { value: "50k_to_100k", label: t("onboarding.options.50k_to_100k.label"), description: t("onboarding.options.50k_to_100k.description") },
        { value: "over_100k", label: t("onboarding.options.over_100k.label"), description: t("onboarding.options.over_100k.description") },
        { value: "unsure", label: t("onboarding.options.unsure_budget.label"), description: t("onboarding.options.unsure_budget.description") }
      ]
    },
    {
      id: 4,
      question: t("onboarding.questions.city"),
      type: "text" as const,
      placeholder: t("onboarding.placeholder.city")
    }
  ];

  const currentQuestion = questions.find(q => q.id === currentStep);

  React.useEffect(() => {
    // Clear localStorage whenever this component mounts
    // This prevents any lingering onboarding state from interfering
    const savedState = localStorage.getItem('briki-onboarding');
    if (savedState) {
      const { currentStep: savedStep } = JSON.parse(savedState);
      // If we're back at the flow but saved state shows completion, clear it
      if (savedStep === 5) {
        localStorage.removeItem('briki-onboarding');
      }
    }
  }, []);

  if (currentStep === 5) {
    return <CompletionScreen />;
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">¡Gracias por completar el onboarding!</h1>
          <p className="text-gray-600">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Paths */}
      <BackgroundPaths />
      
      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <QuestionCard
          question={currentQuestion}
          onAnswer={(value: string) => {
            // Store the answer based on the current step
            const answerKeys = ['insuranceType', 'coverageFor', 'budget', 'city'];
            const currentKey = answerKeys[currentStep - 1];
            if (currentKey) {
              setAnswer(currentKey as any, value);
            }
            
            // If this is the last question, complete onboarding
            if (currentStep === 4) {
              completeOnboarding();
            } else {
              goToNext();
            }
          }}
        />
      </div>
    </div>
  );
} 