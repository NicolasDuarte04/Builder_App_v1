"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink, Info, Shield } from 'lucide-react';
import type { AnyPlan, PlanV2 } from '@/types/plan';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPrice, localizedName, localizedBenefits } from '@/lib/formatters';

interface InsurancePlanCardProps {
  plan: AnyPlan as any;
  onQuote: (planId: string) => void;
  onDetails: (planId: string) => void;
}

export function InsurancePlanCard({ plan, onQuote, onDetails }: InsurancePlanCardProps) {
  const { language } = useTranslation();
  const isEN = language === 'en';
  const isV2 = ((p: AnyPlan): p is PlanV2 => (p as any)._schema === 'v2')(plan as AnyPlan);
  const productUrl = isV2 ? (plan as any).external_link : (plan as any).website ?? (plan as any).external_link;
  const brochureUrl = isV2 ? (plan as any).brochure_link ?? undefined : (plan as any).brochure ?? undefined;
  const displayName = localizedName((plan as any).name || (plan as any).plan_name, (plan as any).name_en, isEN);
  const benefits = localizedBenefits((plan as any).benefits, (plan as any).benefits_en, isEN);
  const priceText = formatPrice((plan as any).base_price, (plan as any).currency);
  const perLabel = isEN ? '/month' : '/mes';
  const t = (k: string) => {
    const EN = { quote: 'Quote', seeWebsite: 'See Website', viewPolicy: 'View Policy (PDF)', details: 'Details' } as const;
    const ES = { quote: 'Cotizar', seeWebsite: 'Ver sitio', viewPolicy: 'Ver Póliza (PDF)', details: 'Ver detalles' } as const;
    return (isEN ? EN : ES)[k as keyof typeof EN];
  };
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
                  {displayName}
                </CardTitle>
                <p className="text-sm text-gray-600">{plan.provider}</p>
                {Array.isArray((plan as any).tags) && (plan as any).tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(plan as any).tags.slice(0, 2).map((tag: string) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {tag}
                      </span>
                    ))}
                    {(plan as any).tags.length > 2 && (
                      <span className="text-[10px] text-gray-500">+{(plan as any).tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Badge label={plan.category} variant="neutral" className="bg-blue-50 text-blue-700" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              {priceText && (
                <p className="text-2xl font-bold text-blue-600">
                  {priceText} <span className="text-sm font-normal text-gray-600">{perLabel}</span>
                </p>
              )}
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>

          {/* Benefits preview */}
          {Array.isArray(benefits) && benefits.length > 0 && (
            <div className="text-sm text-gray-700 space-y-1">
              {benefits.slice(0, 2).map((b, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="text-green-500">•</span>
                  <span className="line-clamp-1">{b}</span>
                </div>
              ))}
              {benefits.length > 2 && (
                <details className="mt-1">
                  <summary className="cursor-pointer select-none text-xs text-blue-600 hover:text-blue-700">
                    +{benefits.length - 2} {isEN ? 'more' : 'más'}
                  </summary>
                  <div className="mt-1 space-y-1">
                    {benefits.slice(2).map((b, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <span className="text-green-500">•</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
            {productUrl ? (
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> {t('quote')}
              </a>
            ) : (
              <span className="inline-flex items-center justify-center rounded-md bg-gray-100 text-gray-400 text-sm px-3 py-2 cursor-not-allowed" title={isEN ? 'Link unavailable' : 'Enlace no disponible'}>
                {t('quote')}
              </span>
            )}

            {brochureUrl && brochureUrl !== productUrl && (
              <a
                href={brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 hover:border-blue-300 text-sm px-3 py-2"
              >
                {t('viewPolicy')}
              </a>
            )}

            <button
              onClick={() => onDetails((plan as any).id)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 hover:border-blue-300 text-sm px-3 py-2"
            >
              <Info className="w-4 h-4 mr-2" /> {isEN ? 'Details' : 'Ver detalles'}
            </button>
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