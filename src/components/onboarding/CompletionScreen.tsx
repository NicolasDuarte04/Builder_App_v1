'use client';

import * as React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';

export function CompletionScreen() {
  const { answers, completeOnboarding } = useOnboarding();

  const generateInsuranceSummary = (answers: any) => {
    const insuranceType = answers.insuranceType || 'unsure';
    const coverageFor = answers.coverageFor || 'me';
    const budget = answers.budget || 'unsure';
    const city = answers.city || 'Colombia';
    
    const insuranceTypeMap: { [key: string]: string } = {
      health: 'seguro de salud',
      life: 'seguro de vida',
      auto: 'seguro vehicular',
      home: 'seguro de hogar',
      travel: 'seguro de viajes',
      business: 'seguro empresarial',
      unsure: 'seguro'
    };

    const coverageMap: { [key: string]: string } = {
      me: 'cobertura individual',
      couple: 'cobertura de pareja',
      family: 'cobertura familiar',
      business: 'cobertura empresarial'
    };

    const budgetMap: { [key: string]: string } = {
      under_50k: 'presupuesto básico (menos de $50.000)',
      '50k_to_100k': 'presupuesto medio ($50.000 a $100.000)',
      over_100k: 'presupuesto premium (más de $100.000)',
      unsure: 'presupuesto por definir'
    };

    return `Perfecto! He recopilado tu información:

🏥 Tipo de seguro: ${insuranceTypeMap[insuranceType]}
👥 Cobertura: ${coverageMap[coverageFor]}
💰 Presupuesto: ${budgetMap[budget]}
📍 Ubicación: ${city}

Ahora puedo ayudarte a encontrar los mejores planes de seguro que se ajusten a tus necesidades específicas.`;
  };

  const insuranceSummary = generateInsuranceSummary(answers);

  return (
    <div className="min-h-screen relative">
      {/* Background Paths */}
      <BackgroundPaths />
      
      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mb-2">
              <TextGenerateEffect 
                words="¡Perfecto! 🎉"
                className="text-3xl text-gray-800"
                duration={1.0}
              />
            </div>
            <p className="text-gray-600 text-lg">
              Hemos personalizado tu experiencia con Briki
            </p>
          </div>
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Tu información recopilada:
            </h2>
            <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-blue-500">
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {insuranceSummary}
              </p>
            </div>
          </div>
                  <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            💡 Lo que puedes hacer ahora:
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Comparar planes de seguro en tiempo real
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Analizar documentos de seguros con IA
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Recibir recomendaciones personalizadas
            </li>
          </ul>
        </div>
          <div className="text-center">
            <button
              onClick={completeOnboarding}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              ¡Encontrar mi seguro! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 