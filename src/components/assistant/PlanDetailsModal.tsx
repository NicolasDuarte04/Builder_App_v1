"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { InsurancePlan } from '../briki-ai-assistant/NewPlanCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/Badge';
import { useTranslation } from '@/hooks/useTranslation';
import { translateIfEnglish, translateListIfEnglish, formatPlanName } from '@/lib/text-translation';

interface PlanDetailsModalProps {
  plan: InsurancePlan | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'details' | 'quote';
}

export function PlanDetailsModal({ plan, isOpen, onClose, mode }: PlanDetailsModalProps) {
  if (!plan) return null;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const { language } = useTranslation();
  const quoteLabel = language?.startsWith('es') ? 'Ver en el sitio' : 'See on website';

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
                  {formatPlanName(translateIfEnglish(plan.name, language), language)}
                </h3>
                <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {(!plan.basePrice || plan.basePrice === 0) && plan.external_link
                    ? quoteLabel
                    : formatPrice(plan.basePrice, plan.currency)}
                  {!( (!plan.basePrice || plan.basePrice === 0) && plan.external_link ) && (
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400">{language?.startsWith('es') ? '/mes' : '/month'}</span>
                  )}
                </div>
              </div>

              {/* Benefits */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Beneficios principales
                </h4>
                <div className="space-y-2">
                  {translateListIfEnglish(plan.benefits, language).map((benefit, index) => (
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

              {/* Quote Form or External Link */}
              {mode === 'quote' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  {plan.is_external && plan.external_link && plan.link_status !== 'broken' ? (
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                        <ExternalLink className="w-5 h-5" />
                        <span className="font-medium">Cotización externa</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Serás redirigido al sitio oficial de {plan.provider} para completar tu cotización.
                      </p>
                      <Button
                        onClick={() => window.open(plan.external_link!, '_blank', 'noopener,noreferrer')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Ir a {plan.provider}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Cotización no disponible</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Este plan no tiene cotización disponible en línea. Contacta directamente con {plan.provider}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 