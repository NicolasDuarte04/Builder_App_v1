'use client';

import * as React from 'react';
import { useOnboarding } from './OnboardingProvider';

interface QuestionOption {
  value: string;
  label: string;
  description: string;
}

interface Question {
  id: number;
  question: string;
  options?: QuestionOption[];
  type?: 'text';
  placeholder?: string;
}

interface QuestionCardProps {
  question: Question;
  onAnswer: (value: string) => void;
}

// Custom Typewriter Effect Component
function TypewriterEffect({ text, className }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 50); // Adjust speed here (50ms per character)

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text]);

  return (
    <h1 className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </h1>
  );
}

export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [textInput, setTextInput] = React.useState('');
  const { completeOnboarding } = useOnboarding();

  const handleOptionClick = (value: string) => {
    setSelectedOption(value);
    setTimeout(() => {
      onAnswer(value);
      // If this is the final step (step 4), trigger completeOnboarding
      if (question.id === 4) {
        setTimeout(() => {
          completeOnboarding();
        }, 500);
      }
    }, 300);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onAnswer(textInput.trim());
      // If this is the final step (step 4), trigger completeOnboarding
      if (question.id === 4) {
        setTimeout(() => {
          completeOnboarding();
        }, 500);
      }
    }
  };

  const isTextQuestion = question.type === 'text';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="mb-4">
          <TypewriterEffect 
            text={question.question}
            className="text-3xl md:text-4xl font-bold text-gray-800"
          />
        </div>
        <p className="text-gray-600 text-lg animate-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
          {isTextQuestion ? 'Escribe tu ciudad' : 'Selecciona la opción que mejor te describa'}
        </p>
      </div>
      
      {isTextQuestion ? (
        <form onSubmit={handleTextSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={question.placeholder}
              className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm focus:border-blue-500 focus:outline-none transition-colors"
              autoFocus
            />
          </div>
          <div className="text-center">
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.options?.map((option, index) => (
            <button
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 animate-fade-in
                ${selectedOption === option.value
                  ? 'border-blue-500 bg-blue-50/90 backdrop-blur-sm shadow-lg scale-105'
                  : 'border-gray-200 bg-white/90 backdrop-blur-sm hover:border-gray-300 hover:shadow-md'
                }
              `}
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
            >
              {selectedOption === option.value && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="text-left">
                <div className="text-xl font-semibold text-gray-800 mb-2">
                  {option.label}
                </div>
                <div className="text-sm text-gray-600">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm animate-fade-in" style={{ animationDelay: '1200ms', animationFillMode: 'both' }}>
          <span className="text-sm text-gray-600">Paso</span>
          <span className="text-sm font-semibold text-blue-600">{question.id}</span>
          <span className="text-sm text-gray-600">de 4</span>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="flex space-x-1">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step <= question.id ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 