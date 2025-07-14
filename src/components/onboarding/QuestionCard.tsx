'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { language } = useTranslation();
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);

  const handleOptionClick = (value: string) => {
    setSelectedOption(value);
    // Add a small delay for better UX
    setTimeout(() => {
      onAnswer(value);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 dark:border-gray-800">
        {/* Question Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {question.question}
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full mx-auto"></div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.options.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleOptionClick(option.value)}
              className={`
                relative p-4 md:p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105
                ${selectedOption === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                }
              `}
            >
              {/* Selection indicator */}
              {selectedOption === option.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}

              {/* Option Content */}
              <div className="text-left">
                <div className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
                  {option.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'es' 
              ? "Selecciona la opción que mejor te describa"
              : "Select the option that best describes you"
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
} 