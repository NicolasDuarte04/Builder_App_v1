import { useState, useCallback } from 'react';
import { 
  QuestionFlow, 
  Question, 
  UserResponse, 
  ConversationState,
  detectInsuranceCategory,
  isVagueIntent,
  getFlowByCategory,
  getFlowById,
  generateSearchQuery,
  QUESTION_FLOWS,
  FALLBACK_QUESTIONS
} from '@/lib/smart-question-flow';

export function useSmartQuestionFlow() {
  const [conversationState, setConversationState] = useState<ConversationState>({
    responses: [],
    isComplete: false
  });
  
  const [currentFlow, setCurrentFlow] = useState<QuestionFlow | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Initialize flow based on user message
  const initializeFlow = useCallback((userMessage: string) => {
    if (isVagueIntent(userMessage)) {
      // Use fallback questions for vague intents
      setIsActive(true);
      return;
    }

    const category = detectInsuranceCategory(userMessage);
    const flow = getFlowByCategory(category);
    
    if (flow) {
      setCurrentFlow(flow);
      setCurrentQuestionIndex(0);
      setIsActive(true);
      setConversationState(prev => ({
        ...prev,
        currentFlow: flow.id,
        category: category
      }));
    }
  }, []);

  // Get current question
  const getCurrentQuestion = useCallback((): Question | null => {
    if (!isActive) return null;
    
    if (currentFlow) {
      return currentFlow.questions[currentQuestionIndex] || null;
    } else {
      // Return fallback question
      return FALLBACK_QUESTIONS[0] || null;
    }
  }, [currentFlow, currentQuestionIndex, isActive]);

  // Handle user response
  const handleAnswer = useCallback((response: UserResponse) => {
    setConversationState(prev => ({
      ...prev,
      responses: [...prev.responses, response]
    }));

    if (currentFlow) {
      const nextIndex = currentQuestionIndex + 1;
      
      if (nextIndex < currentFlow.questions.length) {
        // Move to next question
        setCurrentQuestionIndex(nextIndex);
      } else {
        // Flow complete
        setIsActive(false);
        setConversationState(prev => ({
          ...prev,
          isComplete: true
        }));
        
        // Generate search query from responses
        const searchQuery = generateSearchQuery([...conversationState.responses, response]);
        return searchQuery;
      }
    } else {
      // Handle fallback question response
      setIsActive(false);
      setConversationState(prev => ({
        ...prev,
        isComplete: true
      }));
    }
    
    return null;
  }, [currentFlow, currentQuestionIndex, conversationState.responses]);

  // Skip current question
  const skipQuestion = useCallback(() => {
    if (currentFlow) {
      const nextIndex = currentQuestionIndex + 1;
      
      if (nextIndex < currentFlow.questions.length) {
        setCurrentQuestionIndex(nextIndex);
      } else {
        setIsActive(false);
        setConversationState(prev => ({
          ...prev,
          isComplete: true
        }));
      }
    }
  }, [currentFlow, currentQuestionIndex]);

  // Reset flow
  const resetFlow = useCallback(() => {
    setCurrentFlow(null);
    setCurrentQuestionIndex(0);
    setIsActive(false);
    setConversationState({
      responses: [],
      isComplete: false
    });
  }, []);

  // Get flow summary
  const getFlowSummary = useCallback(() => {
    if (conversationState.responses.length === 0) return null;
    
    const summary = conversationState.responses.map(response => {
      const question = currentFlow?.questions.find(q => q.id === response.questionId);
      return {
        question: question?.text || response.questionId,
        answer: response.answer
      };
    });
    
    return summary;
  }, [conversationState.responses, currentFlow]);

  // Check if flow should be triggered
  const shouldTriggerFlow = useCallback((userMessage: string): boolean => {
    // Don't trigger if already active
    if (isActive) return false;
    
    // Trigger for vague intents
    if (isVagueIntent(userMessage)) return true;
    
    // Trigger for specific insurance categories
    const category = detectInsuranceCategory(userMessage);
    return category !== 'general';
  }, [isActive]);

  return {
    // State
    isActive,
    currentQuestion: getCurrentQuestion(),
    conversationState,
    
    // Actions
    initializeFlow,
    handleAnswer,
    skipQuestion,
    resetFlow,
    shouldTriggerFlow,
    getFlowSummary
  };
}
