'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from './OnboardingProvider';
import { useTranslation } from '@/hooks/useTranslation';

export function CompletionScreen() {
  const { answers, completeOnboarding } = useOnboarding();
  const { t, language } = useTranslation();

  const generatePersonalizedMessage = (answers: any) => {
    const insuranceType = answers.insuranceType || 'health';
    const age = answers.age || '26-35';
    const familyStatus = answers.familyStatus || 'single';
    const location = answers.location || 'colombia';
    const budget = answers.budget || '51-100';
    const priority = answers.priority || 'coverage';
    
    const insuranceTypeMap: { [key: string]: string } = {
      health: language === 'es' ? 'seguro de salud' : 'health insurance',
      life: language === 'es' ? 'seguro de vida' : 'life insurance',
      auto: language === 'es' ? 'seguro de vehículo' : 'auto insurance',
      home: language === 'es' ? 'seguro de hogar' : 'home insurance',
      business: language === 'es' ? 'seguro empresarial' : 'business insurance',
      travel: language === 'es' ? 'seguro de viaje' : 'travel insurance'
    };

    const locationMap: { [key: string]: string } = {
      colombia: language === 'es' ? 'Colombia' : 'Colombia',
      mexico: language === 'es' ? 'México' : 'Mexico',
      argentina: language === 'es' ? 'Argentina' : 'Argentina',
      other: language === 'es' ? 'tu país' : 'your country'
    };

    const budgetMap: { [key: string]: string } = {
      '0-50': language === 'es' ? 'presupuesto bajo' : 'low budget',
      '51-100': language === 'es' ? 'presupuesto medio' : 'medium budget',
      '101-200': language === 'es' ? 'presupuesto alto' : 'high budget',
      '200+': language === 'es' ? 'presupuesto premium' : 'premium budget'
    };

    return language === 'es' 
      ? `Perfecto! Basándome en tus respuestas, estoy buscando ${insuranceTypeMap[insuranceType]} para alguien de ${age} años, ${familyStatus}, en ${locationMap[location]} con ${budgetMap[budget]}. Priorizas ${priority === 'price' ? 'precio' : priority === 'coverage' ? 'cobertura' : priority === 'speed' ? 'rapidez' : 'reputación'}.`
      : `Perfect! Based on your answers, I'm looking for ${insuranceTypeMap[insuranceType]} for someone ${age} years old, ${familyStatus}, in ${locationMap[location]} with ${budgetMap[budget]}. You prioritize ${priority === 'price' ? 'price' : priority === 'coverage' ? 'coverage' : priority === 'speed' ? 'speed' : 'reputation'}.`;
  };

  const personalizedMessage = generatePersonalizedMessage(answers);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {language === 'es' ? "¡Perfecto! 🎉" : "Perfect! 🎉"}
          </h1>
          <p className="text-gray-600 text-lg">
            {language === 'es' 
              ? "Hemos personalizado tu experiencia con Briki Insurance Assistant"
              : "We've personalized your experience with Briki Insurance Assistant"
            }
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {language === 'es' ? "Tu perfil personalizado:" : "Your personalized profile:"}
          </h2>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-6 border-l-4 border-blue-500"
          >
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {personalizedMessage}
            </p>
          </motion.div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            {language === 'es' ? "💡 Lo que haré por ti:" : "💡 What I'll do for you:"}
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {language === 'es' 
                ? "Buscar los mejores planes de seguros según tu perfil"
                : "Find the best insurance plans based on your profile"
              }
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {language === 'es' 
                ? "Comparar precios y coberturas de diferentes aseguradoras"
                : "Compare prices and coverage from different insurers"
              }
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {language === 'es' 
                ? "Explicar términos y condiciones en lenguaje simple"
                : "Explain terms and conditions in simple language"
              }
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {language === 'es' 
                ? "Responder todas tus preguntas sobre seguros"
                : "Answer all your insurance questions"
              }
            </li>
          </ul>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={completeOnboarding}
            className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            {language === 'es' ? "¡Empezar con Briki! 🚀" : "Start with Briki! 🚀"}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
} 