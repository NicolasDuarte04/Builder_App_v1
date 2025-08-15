"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { InsurancePlan } from '../briki-ai-assistant/NewPlanCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/Badge';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPrice as fmt, localizedBenefits, localizedName } from '@/lib/formatters';

interface PlanDetailsModalProps {
  plan: InsurancePlan | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'details' | 'quote';
}

export function PlanDetailsModal({ plan, isOpen, onClose, mode }: PlanDetailsModalProps) {
  if (!plan) return null;

  const { language } = useTranslation();
  const isEN = language === 'en';
  const t = (k: string) => {
    const EN = { quote: 'Quote', viewPolicy: 'View Policy (PDF)', website: 'See Website', benefits: 'Benefits', policy: 'Policy/Brochure' } as const;
    const ES = { quote: 'Cotizar', viewPolicy: 'Ver Póliza (PDF)', website: 'Ver sitio', benefits: 'Beneficios', policy: 'Póliza/Folleto' } as const;
    return (isEN ? EN : ES)[k as keyof typeof EN];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {mode === 'details' ? 'Detalles del Plan' : 'Cotizar Plan'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {plan.provider} • {plan.category}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Plan Header */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {localizedName((plan as any).name, (plan as any).name_en, isEN)}
                </h3>
                {fmt((plan as any).basePrice ?? (plan as any).base_price, (plan as any).currency) && (
                  <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                    {fmt((plan as any).basePrice ?? (plan as any).base_price, (plan as any).currency)}
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400"> {isEN ? '/month' : '/mes'}</span>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {t('benefits')}
                </h4>
                <div className="space-y-2 max-h-64 overflow-auto pr-1">
                  {localizedBenefits((plan as any).benefits, (plan as any).benefits_en, isEN).map((benefit: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              {plan.features && plan.features.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Características
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {plan.features.map((feature, index) => (
                      <Badge key={index} label={feature} variant="neutral" />
                    ))}
                  </div>
                </div>
              )}

              {/* Policy/Brochure */}
              {(((plan as any).brochure_link || (plan as any).brochure) || ((plan as any).external_link || (plan as any).website)) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
                    {((plan as any).external_link || (plan as any).website) && (
                      <a
                        href={(plan as any).external_link || (plan as any).website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> {t('quote')}
                      </a>
                    )}
                    {((plan as any).brochure_link || (plan as any).brochure) && (
                      <a
                        href={(plan as any).brochure_link || (plan as any).brochure}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 hover:border-blue-300 text-sm px-4 py-2"
                      >
                        {t('viewPolicy')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 