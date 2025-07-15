'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingSession {
  id: string;
  insurance_type: string;
  coverage_target: string;
  budget: string;
  city: string;
  created_at: string;
}

interface PlanCard {
  id: string;
  name: string;
  company: string;
  price: string;
  coverage: string;
  features: string[];
  url: string;
}

interface AssistantInterfaceProps {
  onboardingData: OnboardingSession | null;
}

export function AssistantInterface({ onboardingData }: AssistantInterfaceProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const router = useRouter();

  // Generate initial AI message based on onboarding data
  useEffect(() => {
    if (onboardingData) {
      const initialMessage = generateInitialMessage(onboardingData);
      setMessages([{ role: 'assistant', content: initialMessage }]);
      
      // Simulate AI generating plans based on onboarding data
      setTimeout(() => {
        const mockPlans = generateMockPlans(onboardingData);
        setPlans(mockPlans);
      }, 2000);
    }
  }, [onboardingData]);

  const generateInitialMessage = (data: OnboardingSession) => {
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

    return `¡Hola! 👋 Gracias por completar el onboarding. 

He recopilado tu información:
🏥 **Tipo de seguro**: ${insuranceTypeMap[data.insurance_type] || 'seguro'}
👥 **Cobertura**: ${coverageMap[data.coverage_target] || 'individual'}
💰 **Presupuesto**: ${budgetMap[data.budget] || 'por definir'}
📍 **Ubicación**: ${data.city}

Estoy buscando los mejores planes de seguro que se ajusten a tus necesidades específicas. En unos momentos te mostraré las opciones más relevantes para ti.

¿Hay algo específico que te gustaría saber sobre los planes de seguro?`;
  };

  const generateMockPlans = (data: OnboardingSession): PlanCard[] => {
    const basePlans = [
      {
        id: '1',
        name: 'Plan Básico Salud',
        company: 'Sura',
        price: '$45.000/mes',
        coverage: 'Cobertura básica de salud',
        features: ['Consultas médicas', 'Medicamentos básicos', 'Emergencias'],
        url: 'https://sura.com/plan-basico'
      },
      {
        id: '2',
        name: 'Plan Premium Familia',
        company: 'Colpatria',
        price: '$85.000/mes',
        coverage: 'Cobertura familiar completa',
        features: ['Cobertura familiar', 'Medicamentos premium', 'Especialistas'],
        url: 'https://colpatria.com/plan-premium'
      },
      {
        id: '3',
        name: 'Plan Empresarial',
        company: 'Bolívar',
        price: '$120.000/mes',
        coverage: 'Cobertura empresarial integral',
        features: ['Cobertura empresarial', 'Servicios corporativos', 'Asesoría legal'],
        url: 'https://bolivar.com/plan-empresarial'
      }
    ];

    // Filter plans based on insurance type and budget
    return basePlans.filter(plan => {
      if (data.insurance_type === 'health' && plan.name.includes('Salud')) return true;
      if (data.insurance_type === 'business' && plan.name.includes('Empresarial')) return true;
      if (data.budget === 'under_50k' && plan.price.includes('45.000')) return true;
      if (data.budget === '50k_to_100k' && plan.price.includes('85.000')) return true;
      if (data.budget === 'over_100k' && plan.price.includes('120.000')) return true;
      return true; // Show all plans for now
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user' as const, content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        role: 'assistant' as const, 
        content: 'Gracias por tu pregunta. Estoy procesando tu consulta y te responderé en breve. ¿Te gustaría que te ayude con algo específico sobre los planes de seguro?' 
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleCotizar = (planId: string) => {
    // Check if user is logged in (simplified for now)
    const isLoggedIn = false; // TODO: Implement actual auth check
    
    if (!isLoggedIn) {
      router.push(`/login?redirect=assistant&plan=${planId}`);
    } else {
      // Open plan URL in new tab
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        window.open(plan.url, '_blank');
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Briki AI Assistant</h1>
              <p className="text-sm text-gray-600">Tu asistente personal de seguros</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">En línea</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">Briki está escribiendo...</div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <div className="w-96 bg-gray-50 border-l border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Planes Recomendados</h2>
        
        {plans.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Buscando planes para ti...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                    <p className="text-sm text-gray-600">{plan.company}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{plan.price}</span>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">{plan.coverage}</p>
                
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Características:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="text-green-500 mr-1">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button
                  onClick={() => handleCotizar(plan.id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Cotizar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 