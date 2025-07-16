"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, DollarSign, AlertTriangle, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PolicyAnalysis {
  policyType: string;
  premium: {
    amount: number;
    currency: string;
    frequency: string;
  };
  coverage: {
    limits: Record<string, number>;
    deductibles: Record<string, number>;
    exclusions: string[];
  };
  policyDetails: {
    policyNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    insured: string[];
  };
  keyFeatures: string[];
  recommendations: string[];
  riskScore: number;
}

interface PolicyAnalysisDisplayProps {
  analysis: PolicyAnalysis;
}

export function PolicyAnalysisDisplay({ analysis }: PolicyAnalysisDisplayProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (score <= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Análisis de Póliza
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {analysis.policyType} • {analysis.policyDetails.policyNumber}
        </p>
      </div>

      {/* Premium Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Prima</h4>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(analysis.premium.amount, analysis.premium.currency)}
          <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-1">
            /{analysis.premium.frequency}
          </span>
        </div>
      </div>

      {/* Coverage Limits */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Límites de Cobertura</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.limits).map(([key, value]) => (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{key}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Deductibles */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Deductibles</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.deductibles).map(([key, value]) => (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{key}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Features */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Características Principales</h4>
        </div>
        <div className="space-y-2">
          {analysis.keyFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Exclusions */}
      {analysis.coverage.exclusions.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Exclusiones</h4>
          </div>
          <div className="space-y-2">
            {analysis.coverage.exclusions.map((exclusion, index) => (
              <div key={index} className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{exclusion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Evaluación de Riesgo</h4>
          </div>
          <Badge 
            label={`${analysis.riskScore}/10`} 
            variant="neutral" 
            className={getRiskColor(analysis.riskScore)}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {analysis.riskScore <= 3 ? 'Riesgo bajo' : 
           analysis.riskScore <= 6 ? 'Riesgo moderado' : 'Riesgo alto'}
        </p>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Recomendaciones</h4>
          </div>
          <div className="space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Detalles de la Póliza</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {analysis.policyDetails.effectiveDate && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Fecha de inicio</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.policyDetails.effectiveDate}</p>
            </div>
          )}
          {analysis.policyDetails.expirationDate && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Fecha de vencimiento</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.policyDetails.expirationDate}</p>
            </div>
          )}
          {analysis.policyDetails.insured.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Asegurados</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {analysis.policyDetails.insured.join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 