"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertTriangle, Info } from 'lucide-react';
import type { TemplatePlan } from '@/types/results';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface TemplateCardProps {
  template: TemplatePlan;
  onUseTemplate?: (template: TemplatePlan) => void;
}

export function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  const { t } = useTranslation();

  const handleUseTemplate = () => {
    if (onUseTemplate) {
      onUseTemplate(template);
    }
  };

  return (
    <Card className="h-full border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {template.title}
          </CardTitle>
          <Badge 
            variant="secondary" 
            className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {template.fitScore}% fit
          </Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {template.summary}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price Range */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rango de precio estimado
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(template.priceRangeCop.min)} - {formatCurrency(template.priceRangeCop.max)}
          </div>
        </div>

        {/* Suggested Coverages */}
        {template.suggestedCoverages.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Coberturas incluidas
            </div>
            <div className="flex flex-wrap gap-1">
              {template.suggestedCoverages.slice(0, 4).map((coverage, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {coverage}
                </Badge>
              ))}
              {template.suggestedCoverages.length > 4 && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  +{template.suggestedCoverages.length - 4} más
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {template.redFlags.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="flex items-center text-red-700 dark:text-red-400 text-sm font-medium mb-1">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Consideraciones
            </div>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
              {template.redFlags.map((flag, index) => (
                <li key={index}>• {flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimers */}
        {template.disclaimers.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center text-blue-700 dark:text-blue-400 text-sm font-medium mb-1">
              <Info className="w-4 h-4 mr-1" />
              Información importante
            </div>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              {template.disclaimers.slice(0, 2).map((disclaimer, index) => (
                <li key={index}>• {disclaimer}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <Button 
          onClick={handleUseTemplate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          Usar esta plantilla
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
