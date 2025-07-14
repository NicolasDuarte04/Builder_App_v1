"use client";

import { useEffect, useState } from 'react';
import { useBrikiChat } from '@/hooks/useBrikiChat';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { ChatInterface } from '@/components/features/chat/ChatInterface';

export default function AssistantPage() {
  const { t, language } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingContext, setOnboardingContext] = useState<any>(null);
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading,
  } = useBrikiChat();

  useEffect(() => {
    // Get onboarding context from sessionStorage
    const context = sessionStorage.getItem('briki-insurance-context');
    if (context) {
      const parsedContext = JSON.parse(context);
      setOnboardingContext(parsedContext);
      
      // Send initial message with context
      const initialMessage = generateInitialMessage(parsedContext);
      if (initialMessage) {
        // Add initial message to chat
        setTimeout(() => {
          handleSubmit(new Event('submit') as any, initialMessage);
        }, 1000);
      }
    }
    setIsLoading(false);
  }, []);

  const generateInitialMessage = (context: any) => {
    if (!context) return null;
    
    const insuranceType = context.insuranceType || 'health';
    const age = context.age || '26-35';
    const familyStatus = context.familyStatus || 'single';
    const location = context.location || 'colombia';
    const budget = context.budget || '51-100';
    const priority = context.priority || 'coverage';
    
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
      ? `Hola! Basándome en tu onboarding, estoy buscando ${insuranceTypeMap[insuranceType]} para alguien de ${age} años, ${familyStatus}, en ${locationMap[location]} con ${budgetMap[budget]}. Priorizas ${priority === 'price' ? 'precio' : priority === 'coverage' ? 'cobertura' : priority === 'speed' ? 'rapidez' : 'reputación'}. ¿Qué te gustaría saber sobre los mejores planes disponibles?`
      : `Hello! Based on your onboarding, I'm looking for ${insuranceTypeMap[insuranceType]} for someone ${age} years old, ${familyStatus}, in ${locationMap[location]} with ${budgetMap[budget]}. You prioritize ${priority === 'price' ? 'price' : priority === 'coverage' ? 'coverage' : priority === 'speed' ? 'speed' : 'reputation'}. What would you like to know about the best available plans?`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {language === 'es' ? 'Cargando tu asistente personalizado...' : 'Loading your personalized assistant...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {language === 'es' ? 'Briki Insurance Assistant' : 'Briki Insurance Assistant'}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {language === 'es' 
                ? 'Tu asistente personalizado de seguros. Pregunta lo que necesites y encuentra los mejores planes.'
                : 'Your personalized insurance assistant. Ask anything and find the best plans.'
              }
            </p>
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <ChatInterface 
              isLoading={isChatLoading}
              chatHistory={messages}
              inputValue={input}
              handleInputChange={handleInputChange}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
} 