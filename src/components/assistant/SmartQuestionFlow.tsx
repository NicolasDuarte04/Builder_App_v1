"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Question, UserResponse } from '@/lib/smart-question-flow';
import { useTranslation } from '@/hooks/useTranslation';

interface SmartQuestionFlowProps {
  question: Question;
  onAnswer: (response: UserResponse) => void;
  onSkip?: () => void;
}

export function SmartQuestionFlow({ question, onAnswer, onSkip }: SmartQuestionFlowProps) {
  const { t } = useTranslation();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');

  const handleChoiceSelect = (option: string) => {
    if (question.type === 'coverage') {
      // Multi-select for coverage questions
      setSelectedOptions(prev => 
        prev.includes(option) 
          ? prev.filter(item => item !== option)
          : [...prev, option]
      );
    } else {
      // Single select for other choice questions
      setSelectedOptions([option]);
    }
  };

  const handleSubmit = () => {
    let answer = '';
    
    if (question.type === 'choice') {
      answer = selectedOptions.join(', ');
    } else if (question.type === 'text' || question.type === 'budget') {
      answer = textInput;
    }
    
    if (answer.trim()) {
      onAnswer({
        questionId: question.id,
        answer: answer.trim(),
        timestamp: new Date()
      });
      
      // Reset state
      setSelectedOptions([]);
      setTextInput('');
    }
  };

  const canSubmit = () => {
    if (question.required) {
      if (question.type === 'choice') {
        return selectedOptions.length > 0;
      } else if (question.type === 'text' || question.type === 'budget') {
        return textInput.trim().length > 0;
      }
    }
    return true;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4"
    >
      {/* Question Text */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
          {question.text}
        </h3>
        {question.required && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            * Campo requerido
          </p>
        )}
      </div>

      {/* Choice Options */}
      {question.type === 'choice' && question.options && (
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleChoiceSelect(option)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                selectedOptions.includes(option)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Text/Budget Input */}
      {(question.type === 'text' || question.type === 'budget') && (
        <div className="space-y-2">
          <Input
            type="text"
            placeholder={question.placeholder}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && canSubmit()) {
                handleSubmit();
              }
            }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
        >
          {question.type === 'coverage' ? 'Continuar' : 'Siguiente'}
        </Button>
        
        {!question.required && onSkip && (
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1"
          >
            Omitir
          </Button>
        )}
      </div>

      {/* Selected Coverage Display */}
      {question.type === 'coverage' && selectedOptions.length > 0 && (
        <div className="pt-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Coberturas seleccionadas:
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
              >
                {option}
                <button
                  onClick={() => handleChoiceSelect(option)}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
