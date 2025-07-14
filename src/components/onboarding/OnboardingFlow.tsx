'use client';

import * as React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { QuestionCard } from './QuestionCard';
import { ProgressBar } from './ProgressBar';
import { CompletionScreen } from './CompletionScreen';
import { useQuiz } from '@/hooks/useQuiz';

export function OnboardingFlow() {
  const { currentStep, goToNext, goToPrevious, skipOnboarding, setAnswer } = useOnboarding();
  const { startQuiz, hasCompletedQuiz, getUserPersona } = useQuiz();

  const questions = [
    {
      id: 1,
      question: "¿Qué te gustaría hacer hoy con IA?",
      options: [
        { value: "write", label: "✍️ Escribir", description: "Contenido, emails, posts" },
        { value: "design", label: "🎨 Diseñar", description: "Imágenes, logos, gráficos" },
        { value: "ask", label: "🧠 Preguntar", description: "Consultas, explicaciones" },
        { value: "research", label: "🔍 Investigar", description: "Análisis, datos, tendencias" }
      ]
    },
    {
      id: 2,
      question: "¿Qué herramienta de IA estás usando?",
      options: [
        { value: "chatgpt", label: "🤖 ChatGPT", description: "OpenAI" },
        { value: "midjourney", label: "🎨 Midjourney", description: "Imágenes" },
        { value: "copilot", label: "💻 Copilot", description: "Microsoft" },
        { value: "unsure", label: "❓ No estoy seguro", description: "Aún decidiendo" }
      ]
    },
    {
      id: 3,
      question: "¿Qué estás tratando de crear o con qué necesitas ayuda?",
      options: [
        { value: "content", label: "📝 Contenido", description: "Blogs, artículos, copy" },
        { value: "creative", label: "🎭 Creativo", description: "Historias, ideas, conceptos" },
        { value: "business", label: "💼 Negocios", description: "Estrategias, análisis" },
        { value: "learning", label: "📚 Aprendizaje", description: "Explicaciones, tutoriales" }
      ]
    },
    {
      id: 4,
      question: "¿Para quién es?",
      options: [
        { value: "client", label: "👥 Cliente", description: "Trabajo profesional" },
        { value: "teacher", label: "👨‍🏫 Profesor", description: "Educación" },
        { value: "followers", label: "👤 Seguidores", description: "Redes sociales" },
        { value: "customers", label: "🛒 Clientes", description: "Ventas, marketing" },
        { value: "me", label: "🙋‍♂️ Para mí", description: "Uso personal" }
      ]
    },
    {
      id: 5,
      question: "¿Qué tono prefieres?",
      options: [
        { value: "professional", label: "💼 Profesional", description: "Formal y serio" },
        { value: "friendly", label: "😊 Amigable", description: "Cercano y cálido" },
        { value: "persuasive", label: "🎯 Persuasivo", description: "Convincente" },
        { value: "academic", label: "🎓 Académico", description: "Técnico y detallado" }
      ]
    },
    {
      id: 6,
      question: "¿Has usado IA antes?",
      options: [
        { value: "yes", label: "✅ Sí", description: "Experiencia previa" },
        { value: "no", label: "❌ No", description: "Primera vez" }
      ]
    }
  ];

  const currentQuestion = questions.find(q => q.id === currentStep);

  // Show completion screen after all questions
  if (currentStep > 6) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col relative">
      {/* Header with progress and skip */}
      <div className="flex justify-between items-center p-6 relative">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
        </div>
        <ProgressBar currentStep={currentStep} totalSteps={6} />
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Inicio
          </button>
          <button
            onClick={skipOnboarding}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Saltar
          </button>
          {/* Quiz option */}
          <button
            onClick={startQuiz}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🧠 Quiz Rápido
          </button>
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 relative">
        <QuestionCard
          question={currentQuestion}
          onAnswer={(value: string) => {
            // Store the answer based on the current step
            const answerKeys = ['goal', 'tool', 'project', 'audience', 'tone', 'experience'];
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