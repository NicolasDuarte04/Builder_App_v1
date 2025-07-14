'use client';

import * as React from 'react';
import { useOnboarding } from './OnboardingProvider';

export function CompletionScreen() {
  const { answers, completeOnboarding } = useOnboarding();

  const generateCustomPrompt = (answers: any) => {
    const goal = answers.goal || 'write';
    const tool = answers.tool || 'chatgpt';
    const project = answers.project || 'content';
    const audience = answers.audience || 'me';
    const tone = answers.tone || 'friendly';
    
    const goalMap: { [key: string]: string } = {
      write: 'escribir contenido',
      design: 'diseñar',
      ask: 'hacer preguntas',
      research: 'investigar'
    };

    const toneMap: { [key: string]: string } = {
      professional: 'profesional',
      friendly: 'amigable',
      persuasive: 'persuasivo',
      academic: 'académico'
    };

    return `Actúa como un experto en ${goalMap[goal]} con un tono ${toneMap[tone]}.

Ayúdame a crear ${project === 'content' ? 'contenido' : project === 'creative' ? 'ideas creativas' : project === 'business' ? 'estrategias de negocio' : 'material educativo'} para ${audience === 'me' ? 'uso personal' : audience === 'client' ? 'un cliente' : audience === 'followers' ? 'mis seguidores' : audience === 'customers' ? 'mis clientes' : 'un profesor'}.

Proporciona sugerencias específicas y útiles.`;
  };

  const customPrompt = generateCustomPrompt(answers);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Perfecto! 🎉
          </h1>
          <p className="text-gray-600 text-lg">
            Hemos personalizado tu experiencia con Briki
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Tu prompt personalizado:
          </h2>
          <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-blue-500">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {customPrompt}
            </p>
          </div>
        </div>
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            💡 Consejos para empezar:
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Usa este prompt como punto de partida
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Modifica según tus necesidades específicas
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Guarda tus mejores prompts para reutilizar
            </li>
          </ul>
        </div>
        <div className="text-center">
          <button
            onClick={completeOnboarding}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            ¡Empezar con Briki! 🚀
          </button>
        </div>
      </div>
    </div>
  );
} 