"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink, Info, Shield } from 'lucide-react';
import { InsurancePlan } from '@/lib/render-db';
import { useTranslation } from '@/hooks/useTranslation';
import { translateIfEnglish } from '@/lib/text-translation';

interface InsurancePlanCardProps {
  plan: InsurancePlan;
  onQuote: (planId: string) => void;
  onDetails: (planId: string) => void;
}

export function InsurancePlanCard({ plan, onQuote, onDetails }: InsurancePlanCardProps) {
  const { language } = useTranslation();
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };
  const quoteLabel = language?.startsWith('es') ? 'Ver en el sitio' : 'See on website';

  const getProviderLogo = (provider: string) => {
    // Map provider names to logo paths
    const logoMap: Record<string, string> = {
      'sura': '/images/products/sura.png',
      'allianz': '/images/products/allianz-latam.png',
      'axa': '/images/products/axa-colpatria.png',
      'equidad': '/images/products/equidad-seguros.png',
      'hdi': '/images/products/hdi-seguros.png',
      'liberty': '/images/products/liberty-latam.png',
      'mapfre': '/images/products/mapfre.png',
      'mundial': '/images/products/mundial-seguros.png',
      'sbs': '/images/products/sbs-seguros.png',
      'bolivar': '/images/products/seguros-bolivar.png'
    };

    const providerKey = provider.toLowerCase().replace(/\s+/g, '');
    return logoMap[providerKey] || '/images/products/default-insurer.png';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="border border-gray-200 hover:border-blue-300 transition-colors duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={getProviderLogo(plan.provider)}
                  alt={`${plan.provider} logo`}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/products/default-insurer.png';
                  }}
                />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {translateIfEnglish((plan as any).plan_name ?? plan.plan_name, language)}
                </CardTitle>
                <p className="text-sm text-gray-600">{plan.provider}</p>
              </div>
            </div>
            <Badge label={plan.category} variant="neutral" className="bg-blue-50 text-blue-700" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Prima mensual</p>
              <p className="text-2xl font-bold text-blue-600">
                {(!plan.base_price || plan.base_price === 0) && plan.external_link
                  ? quoteLabel
                  : formatPrice(plan.base_price)}
              </p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>

          {/* Coverage Summary */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Cobertura principal</p>
            <p className="text-sm text-gray-800 line-clamp-2">
              {plan.coverage_summary}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={() => onQuote(plan.id)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Cotizar
            </Button>
            <Button
              onClick={() => onDetails(plan.id)}
              variant="outline"
              className="flex-1 border-gray-300 hover:border-blue-300"
              size="sm"
            >
              <Info className="w-4 h-4 mr-2" />
              Ver detalles
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface InsurancePlansGridProps {
  plans: InsurancePlan[];
  onQuote: (planId: string) => void;
  onDetails: (planId: string) => void;
}

export function InsurancePlansGrid({ plans, onQuote, onDetails }: InsurancePlansGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {plans.map((plan) => (
        <InsurancePlanCard
          key={plan.id}
          plan={plan}
          onQuote={onQuote}
          onDetails={onDetails}
        />
      ))}
    </div>
  );
} 