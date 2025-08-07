export interface ConversationState {
  lastQuestion?: string;
  lastQuestionTime?: number;
  askedQuestions: Set<string>;
  userPreferences?: {
    insuranceType?: string;
    budget?: string;
    coverage?: string[];
    language?: 'es' | 'en';
  };
  conversationHistory: string[];
  isWaitingForClarification: boolean;
}

export class ConversationStateManager {
  private state: ConversationState = {
    askedQuestions: new Set(),
    conversationHistory: [],
    isWaitingForClarification: false
  };

  // Check if we've already asked a similar question recently
  hasAskedSimilarQuestion(question: string, timeWindowMs: number = 30000): boolean {
    const normalizedQuestion = this.normalizeQuestion(question);
    
    // Check if we asked this exact question recently
    if (this.state.lastQuestion === normalizedQuestion) {
      const timeSinceLastQuestion = Date.now() - (this.state.lastQuestionTime || 0);
      if (timeSinceLastQuestion < timeWindowMs) {
        return true;
      }
    }
    
    // Check if we've asked a similar question
    return this.state.askedQuestions.has(normalizedQuestion);
  }

  // Add a question to the tracking
  addQuestion(question: string): void {
    const normalizedQuestion = this.normalizeQuestion(question);
    this.state.lastQuestion = normalizedQuestion;
    this.state.lastQuestionTime = Date.now();
    this.state.askedQuestions.add(normalizedQuestion);
    
    // Keep only the last 10 questions to prevent memory bloat
    if (this.state.askedQuestions.size > 10) {
      const questionsArray = Array.from(this.state.askedQuestions);
      this.state.askedQuestions.clear();
      questionsArray.slice(-5).forEach(q => this.state.askedQuestions.add(q));
    }
  }

  // Normalize question for comparison
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[¿?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Check if user input is vague and needs clarification
  isVagueInput(input: string): boolean {
    const vaguePhrases = [
      'seguro', 'seguros', 'póliza', 'pólizas',
      'necesito', 'quiero', 'busco', 'ayuda',
      'hola', 'buenos días', 'buenas tardes',
      'insurance', 'help', 'hello', 'hi'
    ];
    
    const normalizedInput = input.toLowerCase().trim();
    return vaguePhrases.some(phrase => normalizedInput.includes(phrase));
  }

  // Get a smart fallback response for vague inputs
  getSmartFallbackResponse(language: 'es' | 'en' = 'es'): string {
    const responses = language === 'es' ? [
      '¿Qué tipo de seguro te interesa? Tenemos de auto, salud, vida, hogar y más.',
      'Te ayudo a encontrar el seguro perfecto. ¿Qué necesitas proteger?',
      'Puedo mostrarte opciones populares. ¿Qué te interesa más?',
      '¿Auto, salud, vida, hogar? ¿Cuál te gustaría ver primero?'
    ] : [
      'What type of insurance interests you? We have auto, health, life, home and more.',
      'I can help you find the perfect insurance. What do you need to protect?',
      'I can show you popular options. What interests you most?',
      'Auto, health, life, home? Which would you like to see first?'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Check if we should provide a best-effort search instead of asking questions
  shouldProvideBestEffortSearch(userInput: string): boolean {
    const bestEffortTriggers = [
      'el más barato', 'el mejor', 'dame el mejor', 'muéstrame',
      'the cheapest', 'the best', 'show me', 'give me'
    ];
    
    const normalizedInput = userInput.toLowerCase();
    return bestEffortTriggers.some(trigger => normalizedInput.includes(trigger));
  }

  // Get best effort search parameters
  getBestEffortSearchParams(userInput: string): any {
    const input = userInput.toLowerCase();
    
    // Detect category from input
    let category = 'general';
    if (input.includes('auto') || input.includes('carro') || input.includes('vehículo')) {
      category = 'auto';
    } else if (input.includes('salud') || input.includes('médico') || input.includes('hospital')) {
      category = 'salud';
    } else if (input.includes('vida') || input.includes('fallecimiento') || input.includes('muerte')) {
      category = 'vida';
    } else if (input.includes('hogar') || input.includes('casa') || input.includes('apartamento')) {
      category = 'hogar';
    }
    
    // Detect if user wants cheapest
    const tags = input.includes('barato') || input.includes('cheap') ? ['popular'] : [];
    
    return {
      category,
      tags,
      max_price: input.includes('barato') ? 50000 : undefined
    };
  }

  // Update user preferences
  updateUserPreferences(preferences: Partial<ConversationState['userPreferences']>): void {
    this.state.userPreferences = {
      ...this.state.userPreferences,
      ...preferences
    };
  }

  // Get current state
  getState(): ConversationState {
    return { ...this.state };
  }

  // Reset state (useful for new conversations)
  reset(): void {
    this.state = {
      askedQuestions: new Set(),
      conversationHistory: [],
      isWaitingForClarification: false
    };
  }
}

// Global instance
export const conversationStateManager = new ConversationStateManager();
