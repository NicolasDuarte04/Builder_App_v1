'use client';

import * as React from 'react';

interface QuestionOption {
  value: string;
  label: string;
  description: string;
}

interface Question {
  id: number;
  question: string;
  options: QuestionOption[];
}

interface QuestionCardProps {
  question: Question;
  onAnswer: (value: string) => void;
}

export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);

  const handleOptionClick = (value: string) => {
    setSelectedOption(value);
    setTimeout(() => {
      onAnswer(value);
    }, 300);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          {question.question}
        </h1>
        <p className="text-gray-600 text-lg">
          Selecciona la opción que mejor te describa
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleOptionClick(option.value)}
            className={`
              relative p-6 rounded-xl border-2 transition-all duration-200 transform hover:scale-105
              ${selectedOption === option.value
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
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
      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
          <span className="text-sm text-gray-600">Paso</span>
          <span className="text-sm font-semibold text-blue-600">{question.id}</span>
          <span className="text-sm text-gray-600">de 6</span>
        </div>
      </div>
    </div>
  );
} 