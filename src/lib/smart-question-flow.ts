export interface QuestionFlow {
  id: string;
  category: string;
  questions: Question[];
  followUpQuestions?: Question[];
}

export interface Question {
  id: string;
  text: string;
  type: 'choice' | 'text' | 'budget' | 'coverage';
  options?: string[];
  placeholder?: string;
  required: boolean;
  nextQuestionId?: string;
}

export interface UserResponse {
  questionId: string;
  answer: string;
  timestamp: Date;
}

export interface ConversationState {
  currentFlow?: string;
  responses: UserResponse[];
  category?: string;
  budget?: string;
  coverage?: string[];
  isComplete: boolean;
}

// Smart question flows based on insurance categories
export const QUESTION_FLOWS: QuestionFlow[] = [
  {
    id: 'auto-insurance',
    category: 'auto',
    questions: [
      {
        id: 'auto-type',
        text: '¿Qué tipo de seguro de auto necesitas?',
        type: 'choice',
        options: ['Responsabilidad Civil', 'Todo Riesgo', 'Robo y Hurto', 'Daños a Terceros', 'Asistencia Vial'],
        required: true,
        nextQuestionId: 'auto-budget'
      },
      {
        id: 'auto-budget',
        text: '¿Cuál es tu presupuesto mensual aproximado?',
        type: 'budget',
        placeholder: 'Ej: $50,000 - $100,000 COP',
        required: true,
        nextQuestionId: 'auto-usage'
      },
      {
        id: 'auto-usage',
        text: '¿Cómo usas principalmente tu vehículo?',
        type: 'choice',
        options: ['Uso personal', 'Trabajo/Comercial', 'Transporte familiar', 'Viajes frecuentes'],
        required: true,
        nextQuestionId: 'auto-coverage'
      },
      {
        id: 'auto-coverage',
        text: '¿Qué coberturas te interesan más?',
        type: 'coverage',
        options: ['Daños por accidente', 'Robo total', 'Asistencia 24/7', 'Gastos médicos', 'Defensa legal'],
        required: false
      }
    ]
  },
  {
    id: 'health-insurance',
    category: 'health',
    questions: [
      {
        id: 'health-type',
        text: '¿Qué tipo de seguro de salud buscas?',
        type: 'choice',
        options: ['Medicina Prepagada', 'Seguro Complementario', 'Seguro de Gastos Médicos', 'Seguro de Hospitalización'],
        required: true,
        nextQuestionId: 'health-budget'
      },
      {
        id: 'health-budget',
        text: '¿Cuál es tu presupuesto mensual?',
        type: 'budget',
        placeholder: 'Ej: $100,000 - $300,000 COP',
        required: true,
        nextQuestionId: 'health-family'
      },
      {
        id: 'health-family',
        text: '¿Para quién es la cobertura?',
        type: 'choice',
        options: ['Solo para mí', 'Mi pareja y yo', 'Toda mi familia', 'Mis padres'],
        required: true,
        nextQuestionId: 'health-coverage'
      },
      {
        id: 'health-coverage',
        text: '¿Qué servicios te interesan más?',
        type: 'coverage',
        options: ['Consultas médicas', 'Exámenes de laboratorio', 'Hospitalización', 'Medicamentos', 'Especialistas'],
        required: false
      }
    ]
  },
  {
    id: 'life-insurance',
    category: 'life',
    questions: [
      {
        id: 'life-type',
        text: '¿Qué tipo de seguro de vida necesitas?',
        type: 'choice',
        options: ['Seguro de Vida', 'Seguro de Invalidez', 'Seguro Educativo', 'Seguro de Decesos'],
        required: true,
        nextQuestionId: 'life-budget'
      },
      {
        id: 'life-budget',
        text: '¿Cuál es tu presupuesto mensual?',
        type: 'budget',
        placeholder: 'Ej: $50,000 - $150,000 COP',
        required: true,
        nextQuestionId: 'life-beneficiaries'
      },
      {
        id: 'life-beneficiaries',
        text: '¿Para quién quieres la protección?',
        type: 'choice',
        options: ['Para mí', 'Para mi familia', 'Para mis hijos', 'Para mis padres'],
        required: true,
        nextQuestionId: 'life-coverage'
      },
      {
        id: 'life-coverage',
        text: '¿Qué tipo de protección buscas?',
        type: 'coverage',
        options: ['Protección por fallecimiento', 'Invalidez total', 'Enfermedades graves', 'Educación de hijos'],
        required: false
      }
    ]
  },
  {
    id: 'home-insurance',
    category: 'home',
    questions: [
      {
        id: 'home-type',
        text: '¿Qué tipo de seguro de hogar necesitas?',
        type: 'choice',
        options: ['Seguro de Hogar', 'Seguro de Contenido', 'Seguro de Responsabilidad Civil', 'Seguro de Desastres'],
        required: true,
        nextQuestionId: 'home-budget'
      },
      {
        id: 'home-budget',
        text: '¿Cuál es tu presupuesto mensual?',
        type: 'budget',
        placeholder: 'Ej: $30,000 - $80,000 COP',
        required: true,
        nextQuestionId: 'home-property'
      },
      {
        id: 'home-property',
        text: '¿Qué tipo de propiedad quieres asegurar?',
        type: 'choice',
        options: ['Casa propia', 'Apartamento', 'Local comercial', 'Oficina'],
        required: true,
        nextQuestionId: 'home-coverage'
      },
      {
        id: 'home-coverage',
        text: '¿Qué coberturas te interesan?',
        type: 'coverage',
        options: ['Daños por desastres', 'Robo de contenido', 'Responsabilidad civil', 'Daños por agua', 'Interrupción de servicios'],
        required: false
      }
    ]
  },
  {
    id: 'general-insurance',
    category: 'general',
    questions: [
      {
        id: 'general-category',
        text: '¿Qué tipo de seguro te interesa?',
        type: 'choice',
        options: ['Seguro de Auto', 'Seguro de Salud', 'Seguro de Vida', 'Seguro de Hogar', 'Seguro de Viaje', 'Seguro Empresarial'],
        required: true,
        nextQuestionId: 'general-budget'
      },
      {
        id: 'general-budget',
        text: '¿Cuál es tu presupuesto mensual aproximado?',
        type: 'budget',
        placeholder: 'Ej: $50,000 - $200,000 COP',
        required: true,
        nextQuestionId: 'general-purpose'
      },
      {
        id: 'general-purpose',
        text: '¿Cuál es tu principal motivo para buscar seguro?',
        type: 'choice',
        options: ['Protección familiar', 'Cumplimiento legal', 'Tranquilidad', 'Cobertura específica', 'Recomendación'],
        required: true
      }
    ]
  }
];

// Fallback questions for vague intents
export const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'welcome-intent',
    text: '¡Hola! Soy tu asistente de seguros. ¿En qué puedo ayudarte hoy?',
    type: 'choice',
    options: [
      'Quiero comparar planes de seguro',
      'Necesito asesoría sobre seguros',
      'Tengo dudas sobre mi póliza actual',
      'Quiero analizar un documento de seguro'
    ],
    required: true
  }
];

// Helper functions
export function detectInsuranceCategory(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  if (message.includes('auto') || message.includes('carro') || message.includes('vehículo') || message.includes('moto')) {
    return 'auto';
  }
  if (message.includes('salud') || message.includes('médico') || message.includes('hospital') || message.includes('doctor')) {
    return 'health';
  }
  if (message.includes('vida') || message.includes('fallecimiento') || message.includes('muerte') || message.includes('invalidez')) {
    return 'life';
  }
  if (message.includes('hogar') || message.includes('casa') || message.includes('apartamento') || message.includes('propiedad')) {
    return 'home';
  }
  if (message.includes('viaje') || message.includes('turismo') || message.includes('vacaciones')) {
    return 'travel';
  }
  if (message.includes('empresa') || message.includes('negocio') || message.includes('comercial')) {
    return 'business';
  }
  
  return 'general';
}

export function isVagueIntent(userMessage: string): boolean {
  const vaguePhrases = [
    'hola', 'buenos días', 'buenas tardes', 'buenas noches',
    'quiero un seguro', 'necesito seguro', 'busco seguro',
    'ayuda', 'necesito ayuda', 'puedes ayudarme',
    'seguro', 'seguros', 'póliza', 'pólizas'
  ];
  
  const message = userMessage.toLowerCase().trim();
  return vaguePhrases.some(phrase => message.includes(phrase));
}

export function getNextQuestion(flow: QuestionFlow, currentQuestionId: string, userResponse: string): Question | null {
  const currentQuestion = flow.questions.find(q => q.id === currentQuestionId);
  if (!currentQuestion) return null;
  
  if (currentQuestion.nextQuestionId) {
    return flow.questions.find(q => q.id === currentQuestion.nextQuestionId) || null;
  }
  
  return null;
}

export function generateSearchQuery(responses: UserResponse[]): string {
  const category = responses.find(r => r.questionId.includes('type') || r.questionId.includes('category'))?.answer;
  const budget = responses.find(r => r.questionId.includes('budget'))?.answer;
  const coverage = responses.filter(r => r.questionId.includes('coverage')).map(r => r.answer);
  
  let query = '';
  
  if (category) {
    query += `seguro de ${category}`;
  }
  
  if (budget) {
    query += ` con presupuesto ${budget}`;
  }
  
  if (coverage.length > 0) {
    query += ` que incluya ${coverage.join(', ')}`;
  }
  
  return query.trim();
}

export function getFlowByCategory(category: string): QuestionFlow | null {
  return QUESTION_FLOWS.find(flow => flow.category === category) || null;
}

export function getFlowById(flowId: string): QuestionFlow | null {
  return QUESTION_FLOWS.find(flow => flow.id === flowId) || null;
}
