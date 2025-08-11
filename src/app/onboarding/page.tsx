"use client";

import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Error al cargar el onboarding
            </h1>
            <p className="text-gray-600 mb-6">
              Hubo un problema al inicializar el proceso de onboarding.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/assistant'}>
                Ir al Asistente
              </Button>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Onboarding Error:', error, errorInfo);
      }}
    >
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    </ErrorBoundary>
  );
}
