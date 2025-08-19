"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, XCircle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';

interface PolicyComparisonViewProps {
  policies: any[];
  onClose: () => void;
}

export function PolicyComparisonView({ policies, onClose }: PolicyComparisonViewProps) {
  if (policies.length < 2) return null;

  const formatCurrency = (amount: number, currency: string = "COP") => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const compareFeatures = () => {
    const allFeatures = new Set<string>();
    policies.forEach(policy => {
      const features = policy.extracted_data?.keyFeatures || [];
      features.forEach((f: string) => allFeatures.add(f));
    });
    return Array.from(allFeatures);
  };

  const features = compareFeatures();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-auto"
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Comparación de Pólizas
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">
                  Característica
                </th>
                {policies.map((policy, index) => (
                  <th key={policy.id} className="p-4 text-center">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {policy.custom_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {policy.insurer_name}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Premium */}
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-4 font-medium">Prima</td>
                {policies.map((policy) => (
                  <td key={policy.id} className="p-4 text-center">
                    {policy.metadata?.premium_amount ? (
                      <div>
                        <p className="font-semibold text-lg">
                          {formatCurrency(policy.metadata.premium_amount)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          /{policy.metadata.premium_frequency || "mes"}
                        </p>
                      </div>
                    ) : (
                      <Minus className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </td>
                ))}
              </tr>

              {/* Policy Type */}
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-4 font-medium">Tipo de Póliza</td>
                {policies.map((policy) => (
                  <td key={policy.id} className="p-4 text-center">
                    <Badge variant="outline">
                      {policy.policy_type || "General"}
                    </Badge>
                  </td>
                ))}
              </tr>

              {/* Risk Score */}
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-4 font-medium">Puntuación de Riesgo</td>
                {policies.map((policy) => (
                  <td key={policy.id} className="p-4 text-center">
                    {policy.metadata?.risk_score !== undefined ? (
                      <Badge 
                        variant="neutral"
                        className={
                          policy.metadata.risk_score <= 3 
                            ? "bg-green-100 text-green-800" 
                            : policy.metadata.risk_score <= 6 
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {policy.metadata.risk_score}/10
                      </Badge>
                    ) : (
                      <Minus className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </td>
                ))}
              </tr>

              {/* Features */}
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-4 font-medium" colSpan={policies.length + 1}>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Características Incluidas
                  </div>
                </td>
              </tr>
              {features.map((feature, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-4 text-sm">{feature}</td>
                  {policies.map((policy) => {
                    const hasFeature = policy.extracted_data?.keyFeatures?.includes(feature);
                    return (
                      <td key={policy.id} className="p-4 text-center">
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

              {/* Recommendations Count */}
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-4 font-medium">Recomendaciones</td>
                {policies.map((policy) => (
                  <td key={policy.id} className="p-4 text-center">
                    <Badge variant="outline">
                      {policy.extracted_data?.recommendations?.length || 0} sugerencias
                    </Badge>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <Button onClick={onClose}>
            Cerrar Comparación
          </Button>
        </div>
      </div>
    </motion.div>
  );
}