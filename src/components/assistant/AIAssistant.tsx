'use client';

import * as React from 'react';
import { useOnboarding } from '../onboarding/OnboardingProvider';

interface AIAssistantProps {
  onboardingData: {
    insuranceType: string;
    coverageTarget: string;
    budget: string;
    city: string;
  };
}

export function AIAssistant({ onboardingData }: AIAssistantProps) {
  const [messages, setMessages] = React.useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // Generate initial welcome message based on onboarding data
  const generateWelcomeMessage = () => {
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

    const insuranceType = insuranceTypeMap[onboardingData.insuranceType] || 'seguro';
    const coverage = coverageMap[onboardingData.coverageTarget] || 'cobertura';
    const budget = budgetMap[onboardingData.budget] || 'presupuesto';
    const city = onboardingData.city || 'Colombia';

    return `¡Perfecto! He recopilado tu información:

🏥 **Tipo de seguro**: ${insuranceType}
👥 **Cobertura**: ${coverage}
💰 **Presupuesto**: ${budget}
📍 **Ubicación**: ${city}

Ahora puedo ayudarte a encontrar los mejores planes de seguro que se ajusten a tus necesidades específicas. 

¿Qué te gustaría hacer primero?
• Comparar planes disponibles
• Analizar documentos de seguros
• Recibir recomendaciones personalizadas
• Hacer preguntas sobre coberturas

¡Estoy listo para ayudarte! 🤖`;
  };

  // Initialize with welcome message
  React.useEffect(() => {
    const welcomeMessage = generateWelcomeMessage();
    setMessages([
      {
        id: 'welcome',
        type: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
  }, [onboardingData]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // TODO: Implement actual AI chat functionality
    // For now, simulate a response
    setTimeout(() => {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: 'Gracias por tu mensaje. Estoy procesando tu solicitud y pronto te ayudaré a encontrar las mejores opciones de seguro para ti.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* No custom header - only navbar should be visible */}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl px-4 py-3 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-line">{message.content}</div>
              <div
                className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Briki está escribiendo...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje aquí..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
} 