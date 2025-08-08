"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Minus, Star, TrendingUp } from 'lucide-react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';
import { Badge } from '@/components/ui/Badge';

interface ComparisonMessageProps {
  plans: InsurancePlan[];
}

export function ComparisonMessage({ plans }: ComparisonMessageProps) {
  if (plans.length < 2) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Necesitas al menos 2 planes para hacer una comparación.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = "COP") => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const compareFeatures = () => {
    const allFeatures = new Set<string>();
    plans.forEach(plan => {
      if (plan.benefits) {
        plan.benefits.forEach((benefit: string) => allFeatures.add(benefit));
      }
    });
    return Array.from(allFeatures);
  };

  const features = compareFeatures();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comparación de Planes ({plans.length} planes)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Análisis detallado de los planes seleccionados
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm">
                Característica
              </th>
              {plans.map((plan, index) => (
                <th key={plan.id} className="p-3 text-center">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {plan.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {plan.provider}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm">Precio Mensual</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-center">
                  {plan.basePrice && plan.basePrice > 0 ? (
                    <div>
                      <p className="font-semibold text-lg text-gray-900 dark:text-white">
                        {formatCurrency(plan.basePrice, plan.currency)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        /mes
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Minus className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm">Calificación</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-center">
                  {plan.rating ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {plan.rating.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Minus className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Category */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm">Categoría</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-center">
                  <Badge variant="outline" className="text-xs">
                    {plan.category || "General"}
                  </Badge>
                </td>
              ))}
            </tr>

            {/* Features */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm" colSpan={plans.length + 1}>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Beneficios Incluidos
                </div>
              </td>
            </tr>
            {features.map((feature, index) => (
              <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                  {feature}
                </td>
                {plans.map((plan) => {
                  const hasFeature = plan.benefits?.includes(feature);
                  return (
                    <td key={plan.id} className="p-3 text-center">
                      {hasFeature ? (
                        <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 mx-auto text-gray-300" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Benefits Count */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm">Total Beneficios</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-center">
                  <Badge variant="outline">
                    {plan.benefits?.length || 0} beneficios
                  </Badge>
                </td>
              ))}
            </tr>

            {/* External Link */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm">Cotización</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-center">
                  {plan.external_link ? (
                    <a
                      href={plan.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Cotizar ahora
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">No disponible</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Comparación generada automáticamente
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
