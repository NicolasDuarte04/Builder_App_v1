'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingProvider';
import { QuestionCard } from './QuestionCard';
import { ProgressBar } from './ProgressBar';
import { CompletionScreen } from './CompletionScreen';
import { useTranslation } from '@/hooks/useTranslation';

export function OnboardingFlow() {
  const { currentStep, goToNext, goToPrevious, skipOnboarding, setAnswer, answers } = useOnboarding();
  const { t, language } = useTranslation();

  const questions = [
    {
      id: 1,
      question: language === 'es' ? "¿Qué tipo de seguro estás buscando?" : "What type of insurance are you looking for?",
      options: [
        { value: "health", label: language === 'es' ? "🏥 Salud" : "🏥 Health", description: language === 'es' ? "Seguro médico y dental" : "Medical and dental insurance" },
        { value: "life", label: language === 'es' ? "💝 Vida" : "💝 Life", description: language === 'es' ? "Protección para tu familia" : "Protection for your family" },
        { value: "auto", label: language === 'es' ? "🚗 Vehículo" : "🚗 Auto", description: language === 'es' ? "Seguro de carro y moto" : "Car and motorcycle insurance" },
        { value: "home", label: language === 'es' ? "🏠 Hogar" : "🏠 Home", description: language === 'es' ? "Seguro de casa y apartamento" : "House and apartment insurance" },
        { value: "business", label: language === 'es' ? "💼 Empresa" : "💼 Business", description: language === 'es' ? "Seguro empresarial" : "Business insurance" },
        { value: "travel", label: language === 'es' ? "✈️ Viajes" : "✈️ Travel", description: language === 'es' ? "Seguro de viaje" : "Travel insurance" }
      ]
    },
    {
      id: 2,
      question: language === 'es' ? "¿Cuál es tu edad?" : "What is your age?",
      options: [
        { value: "18-25", label: language === 'es' ? "18-25 años" : "18-25 years", description: language === 'es' ? "Adulto joven" : "Young adult" },
        { value: "26-35", label: language === 'es' ? "26-35 años" : "26-35 years", description: language === 'es' ? "Adulto joven" : "Young adult" },
        { value: "36-50", label: language === 'es' ? "36-50 años" : "36-50 years", description: language === 'es' ? "Adulto" : "Adult" },
        { value: "51-65", label: language === 'es' ? "51-65 años" : "51-65 years", description: language === 'es' ? "Adulto mayor" : "Senior" },
        { value: "65+", label: language === 'es' ? "Más de 65 años" : "65+ years", description: language === 'es' ? "Adulto mayor" : "Senior" }
      ]
    },
    {
      id: 3,
      question: language === 'es' ? "¿Cuál es tu estado familiar?" : "What is your family status?",
      options: [
        { value: "single", label: language === 'es' ? "👤 Soltero/a" : "👤 Single", description: language === 'es' ? "Sin dependientes" : "No dependents" },
        { value: "couple", label: language === 'es' ? "👫 Pareja" : "👫 Couple", description: language === 'es' ? "Sin hijos" : "No children" },
        { value: "family", label: language === 'es' ? "👨‍👩‍👧‍👦 Familia" : "👨‍👩‍👧‍👦 Family", description: language === 'es' ? "Con hijos" : "With children" },
        { value: "single_parent", label: language === 'es' ? "👩‍👧‍👦 Padre/Madre soltero" : "👩‍👧‍👦 Single parent", description: language === 'es' ? "Con hijos" : "With children" }
      ]
    },
    {
      id: 4,
      question: language === 'es' ? "¿En qué país o ciudad vives?" : "What country or city do you live in?",
      options: [
        { value: "colombia", label: language === 'es' ? "🇨🇴 Colombia" : "🇨🇴 Colombia", description: language === 'es' ? "Bogotá, Medellín, Cali, etc." : "Bogotá, Medellín, Cali, etc." },
        { value: "mexico", label: language === 'es' ? "🇲🇽 México" : "🇲🇽 Mexico", description: language === 'es' ? "CDMX, Guadalajara, Monterrey" : "CDMX, Guadalajara, Monterrey" },
        { value: "argentina", label: language === 'es' ? "🇦🇷 Argentina" : "🇦🇷 Argentina", description: language === 'es' ? "Buenos Aires, Córdoba, etc." : "Buenos Aires, Córdoba, etc." },
        { value: "other", label: language === 'es' ? "🌍 Otro país" : "🌍 Other country", description: language === 'es' ? "Especifica en el chat" : "Specify in chat" }
      ]
    },
    {
      id: 5,
      question: language === 'es' ? "¿Cuál es tu presupuesto mensual para seguro?" : "What is your monthly budget for insurance?",
      options: [
        { value: "0-50", label: language === 'es' ? "$0 - $50 USD" : "$0 - $50 USD", description: language === 'es' ? "Presupuesto bajo" : "Low budget" },
        { value: "51-100", label: language === 'es' ? "$51 - $100 USD" : "$51 - $100 USD", description: language === 'es' ? "Presupuesto medio" : "Medium budget" },
        { value: "101-200", label: language === 'es' ? "$101 - $200 USD" : "$101 - $200 USD", description: language === 'es' ? "Presupuesto alto" : "High budget" },
        { value: "200+", label: language === 'es' ? "Más de $200 USD" : "More than $200 USD", description: language === 'es' ? "Presupuesto premium" : "Premium budget" }
      ]
    },
    {
      id: 6,
      question: language === 'es' ? "¿Ya tienes algún seguro?" : "Do you already have any insurance?",
      options: [
        { value: "none", label: language === 'es' ? "❌ No tengo seguro" : "❌ I don't have insurance", description: language === 'es' ? "Primera vez" : "First time" },
        { value: "basic", label: language === 'es' ? "✅ Seguro básico" : "✅ Basic insurance", description: language === 'es' ? "Cobertura mínima" : "Minimum coverage" },
        { value: "comprehensive", label: language === 'es' ? "🛡️ Seguro completo" : "🛡️ Comprehensive insurance", description: language === 'es' ? "Cobertura amplia" : "Wide coverage" },
        { value: "multiple", label: language === 'es' ? "📋 Múltiples seguros" : "📋 Multiple insurances", description: language === 'es' ? "Varios tipos" : "Various types" }
      ]
    },
    {
      id: 7,
      question: language === 'es' ? "¿Qué priorizas más al elegir un seguro?" : "What do you prioritize most when choosing insurance?",
      options: [
        { value: "price", label: language === 'es' ? "💰 Precio" : "💰 Price", description: language === 'es' ? "El más económico" : "Most affordable" },
        { value: "coverage", label: language === 'es' ? "🛡️ Cobertura" : "🛡️ Coverage", description: language === 'es' ? "La mejor protección" : "Best protection" },
        { value: "speed", label: language === 'es' ? "⚡ Rapidez" : "⚡ Speed", description: language === 'es' ? "Proceso rápido" : "Quick process" },
        { value: "reputation", label: language === 'es' ? "🏆 Reputación" : "🏆 Reputation", description: language === 'es' ? "Empresa confiable" : "Reliable company" }
      ]
    },
    {
      id: 8,
      question: language === 'es' ? "¿Te gustaría recibir cotizaciones por correo?" : "Would you like to receive quotes by email?",
      options: [
        { value: "yes", label: language === 'es' ? "📧 Sí, enviar cotizaciones" : "📧 Yes, send quotes", description: language === 'es' ? "Recibir ofertas" : "Receive offers" },
        { value: "no", label: language === 'es' ? "❌ No, gracias" : "❌ No, thanks", description: language === 'es' ? "Solo chat" : "Chat only" }
      ]
    }
  ];

  const currentQuestion = questions.find(q => q.id === currentStep);

  // Show completion screen after all questions
  if (currentStep > 8) {
    return <CompletionScreen />;
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {language === 'es' ? "¡Gracias por completar el onboarding!" : "Thank you for completing the onboarding!"}
          </h1>
          <p className="text-gray-600">
            {language === 'es' ? "Redirigiendo al asistente..." : "Redirecting to assistant..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col relative">
      {/* Header with progress and skip */}
      <div className="flex justify-between items-center p-6 relative">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← {language === 'es' ? 'Anterior' : 'Previous'}
          </button>
        </div>
        <ProgressBar currentStep={currentStep} totalSteps={8} />
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {language === 'es' ? 'Inicio' : 'Home'}
          </button>
          <button
            onClick={skipOnboarding}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {language === 'es' ? 'Saltar' : 'Skip'}
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <QuestionCard
              question={currentQuestion}
              onAnswer={(value: string) => {
                // Store the answer based on the current step
                const answerKeys = ['insuranceType', 'age', 'familyStatus', 'location', 'budget', 'currentInsurance', 'priority', 'email'];
                const currentKey = answerKeys[currentStep - 1];
                if (currentKey) {
                  setAnswer(currentKey as any, value);
                }
                goToNext();
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
} 