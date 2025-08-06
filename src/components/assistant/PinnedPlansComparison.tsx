"use client";

import React from 'react';
import { InsurancePlan } from '@/types/project';
import { useTranslation } from '@/hooks/useTranslation';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PinnedPlansComparisonProps {
  plans: InsurancePlan[];
  onViewDetails: (plan: InsurancePlan) => void;
  onQuote: (plan: InsurancePlan) => void;
  onUnpin: (planId: number) => void;
}

export function PinnedPlansComparison({ 
  plans, 
  onViewDetails, 
  onQuote,
  onUnpin 
}: PinnedPlansComparisonProps) {
  const { t } = useTranslation();
  
  if (plans.length === 0) return null;
  
  // Extract common comparison points
  const comparisonPoints = {
    price: 'Price',
    provider: 'Provider',
    rating: 'Rating',
    coverage: 'Coverage Type',
    benefits: 'Key Benefits'
  };
  
  const formatPrice = (price: string | undefined) => {
    if (!price) return '0';
    // Extract numeric value from price string
    const numericPrice = parseInt(price.replace(/[^0-9]/g, ''));
    return new Intl.NumberFormat('es-CO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericPrice || 0);
  };
  
  const getBenefitsList = (benefits: string) => {
    // Parse benefits string into list
    const benefitsList = benefits.split(',').map(b => b.trim()).filter(b => b.length > 0);
    return benefitsList.slice(0, 3); // Show top 3 benefits
  };
  
  const getPriceComparison = (plans: InsurancePlan[]) => {
    const prices = plans.map(p => {
      if (!p.price) return 0;
      return parseInt(p.price.replace(/[^0-9]/g, '')) || 0;
    });
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    return { minPrice, maxPrice };
  };
  
  const { minPrice, maxPrice } = getPriceComparison(plans);
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 p-4">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {t('assistant.comparisonSummary')}
        </h3>
        <p className="text-blue-50 text-sm mt-1">
          {plans.length === 2 ? t('assistant.comparingPlans') : `Comparing ${plans.length} plans`}
        </p>
      </div>
      
      {/* Comparison Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 w-32">
                Feature
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className="p-4 text-left">
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {plan.name}
                    </div>
                    <button
                      onClick={() => onUnpin(plan.id)}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      Remove from comparison
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-4 font-medium text-gray-600 dark:text-gray-400">
                💰 Price
              </td>
              {plans.map((plan) => {
                const price = plan.price ? parseInt(plan.price.replace(/[^0-9]/g, '')) || 0 : 0;
                const isLowest = price === minPrice && price > 0;
                const isHighest = price === maxPrice && minPrice !== maxPrice;
                
                return (
                  <td key={plan.id} className="p-4">
                    <div className="space-y-1">
                      <div className={cn(
                        "text-lg font-bold",
                        isLowest && "text-green-600 dark:text-green-400",
                        isHighest && "text-orange-600 dark:text-orange-400",
                        !isLowest && !isHighest && "text-gray-900 dark:text-white"
                      )}>
                        ${formatPrice(plan.price)} COP
                      </div>
                      {isLowest && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                          Lowest price
                        </span>
                      )}
                      {isHighest && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">
                          Higher price
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Provider Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-4 font-medium text-gray-600 dark:text-gray-400">
                🏢 Provider
              </td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4">
                  <div className="text-gray-900 dark:text-white">
                    {plan.provider}
                  </div>
                </td>
              ))}
            </tr>
            
            {/* Rating Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-4 font-medium text-gray-600 dark:text-gray-400">
                ⭐ Rating
              </td>
              {plans.map((plan) => {
                const rating = parseFloat(plan.rating || '0');
                const maxRating = Math.max(...plans.map(p => parseFloat(p.rating || '0')));
                const isBest = rating === maxRating && rating > 0;
                
                return (
                  <td key={plan.id} className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-lg font-semibold",
                        isBest && "text-yellow-600 dark:text-yellow-400",
                        !isBest && "text-gray-700 dark:text-gray-300"
                      )}>
                        {plan.rating || 'N/A'}
                      </span>
                      {isBest && rating > 0 && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          Best rated
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Benefits Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-4 font-medium text-gray-600 dark:text-gray-400 align-top">
                ✅ Benefits
              </td>
              {plans.map((plan) => {
                const benefits = getBenefitsList(plan.benefits);
                
                return (
                  <td key={plan.id} className="p-4">
                    <ul className="space-y-2">
                      {benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Action Buttons */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-{plans.length} gap-3">
          {plans.map((plan) => (
            <div key={plan.id} className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(plan)}
                className="flex-1"
              >
                Details
              </Button>
              <Button
                size="sm"
                onClick={() => onQuote(plan)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
              >
                Quote
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}