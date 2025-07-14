'use client';

import * as React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { QuestionCard } from './QuestionCard';
import { ProgressBar } from './ProgressBar';
import { CompletionScreen } from './CompletionScreen';
import { useQuiz } from '@/hooks/useQuiz';
import { BackgroundPaths } from '@/components/ui/background-paths';

export function OnboardingFlow() {
  const { currentStep, goToNext, goToPrevious, skipOnboarding, setAnswer } = useOnboarding();
  const { startQuiz, hasCompletedQuiz, getUserPersona } = useQuiz();

  const questions = [
    {
      id: 1,
      question: "¿Qué tipo de seguro necesitas hoy?",
      options: [
        { value: "health", label: "🏥 Salud", description: "Seguro médico y dental" },
        { value: "life", label: "💝 Vida", description: "Protección para tu familia" },
        { value: "auto", label: "🚗 Auto", description: "Seguro vehicular" },
        { value: "home", label: "🏠 Hogar", description: "Seguro de vivienda" },
        { value: "travel", label: "✈️ Viaje", description: "Seguro de viajes" },
        { value: "business", label: "💼 Empresarial", description: "Seguro para tu negocio" },
        { value: "unsure", label: "❓ No estoy seguro", description: "Ayúdame a decidir" }
      ]
    },
    {
      id: 2,
      question: "¿Para quién es este seguro?",
      options: [
        { value: "me", label: "🙋‍♂️ Para mí", description: "Cobertura individual" },
        { value: "couple", label: "👫 Para mí y mi pareja", description: "Cobertura de pareja" },
        { value: "family", label: "👨‍👩‍👧‍👦 Para mi familia", description: "Cobertura familiar" },
        { value: "business", label: "🏢 Para mi negocio", description: "Cobertura empresarial" }
      ]
    },
    {
      id: 3,
      question: "¿Cuánto puedes pagar al mes (aproximadamente)?",
      options: [
        { value: "under_50k", label: "💰 Menos de $50.000", description: "Presupuesto básico" },
        { value: "50k_to_100k", label: "💵 $50.000 a $100.000", description: "Presupuesto medio" },
        { value: "over_100k", label: "💎 Más de $100.000", description: "Presupuesto premium" },
        { value: "unsure", label: "❓ No estoy seguro", description: "Ayúdame a evaluar" }
      ]
    },
    {
      id: 4,
      question: "¿En qué ciudad estás?",
      type: "text" as const,
      placeholder: "Ejemplo: Medellín, Bogotá, Cali..."
    }
  ];

  const currentQuestion = questions.find(q => q.id === currentStep);

  // Show completion screen after all questions
  if (currentStep > 4) {
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
            goToNext();
          }}
        />
      </div>
    </div>
  );
} 