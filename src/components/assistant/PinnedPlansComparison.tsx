"use client";

import React from 'react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';
import { useTranslation } from '@/hooks/useTranslation';
import { Check, X, AlertCircle, DollarSign, Building2, Star, Shield } from 'lucide-react';
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
  
  const formatPrice = (price: number | string | undefined) => {
    if (!price && price !== 0) return '0';
    
    // Handle both number and string formats
    let numericPrice: number;
    if (typeof price === 'number') {
      numericPrice = price;
    } else {
      // Extract numeric value from price string
      numericPrice = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    }
    
    return new Intl.NumberFormat('es-CO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericPrice);
  };
  
  const getBenefitsList = (benefits: string | string[] | undefined | null) => {
    // Handle different types of benefits data
    if (!benefits) {
      return [];
    }
    
    // If benefits is already an array, use it directly
    if (Array.isArray(benefits)) {
      return benefits.slice(0, 3); // Show top 3 benefits
    }
    
    // If benefits is a string, parse it
    if (typeof benefits === 'string') {
      const benefitsList = benefits.split(',').map(b => b.trim()).filter(b => b.length > 0);
      return benefitsList.slice(0, 3); // Show top 3 benefits
    }
    
    return [];
  };
  
  const getPriceComparison = (plans: InsurancePlan[]) => {
    const prices = plans.map(p => {
      // Handle both basePrice (from NewPlanCard) and price fields
      const priceValue = p.basePrice || (p as any).price;
      if (!priceValue) return 0;
      
      if (typeof priceValue === 'number') {
        return priceValue;
      }
      return parseInt(priceValue.replace(/[^0-9]/g, '')) || 0;
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
        <h3 className="text-white font-semibold text-lg">
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
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Price</span>
                </div>
              </td>
              {plans.map((plan) => {
                // Handle both basePrice (from NewPlanCard) and price fields
                const priceValue = plan.basePrice || (plan as any).price;
                const price = typeof priceValue === 'number' ? priceValue : 
                             (priceValue ? parseInt(priceValue.replace(/[^0-9]/g, '')) || 0 : 0);
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
                        ${formatPrice(plan.basePrice || (plan as any).price)} {plan.currency || 'COP'}
                      </div>
                      {isLowest && (
                        <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-md font-medium">
                          Best price
                        </span>
                      )}
                      {isHighest && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md">
                          Premium
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Provider Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Provider</span>
                </div>
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
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Rating</span>
                </div>
              </td>
              {plans.map((plan) => {
                // Handle rating as either number or string
                const rating = typeof plan.rating === 'number' ? plan.rating : parseFloat(plan.rating || '0');
                const maxRating = Math.max(...plans.map(p => 
                  typeof p.rating === 'number' ? p.rating : parseFloat(p.rating || '0')
                ));
                const isBest = rating === maxRating && rating > 0;
                
                return (
                  <td key={plan.id} className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-lg font-semibold",
                        isBest && "text-yellow-600 dark:text-yellow-400",
                        !isBest && "text-gray-700 dark:text-gray-300"
                      )}>
                        {plan.rating ? (typeof plan.rating === 'number' ? plan.rating.toFixed(1) : plan.rating) : 'N/A'}
                      </span>
                      {isBest && rating > 0 && (
                        <span className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-md font-medium">
                          Top rated
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Benefits Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="p-4 align-top">
                <div className="flex items-start gap-2 pt-1">
                  <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Benefits</span>
                </div>
              </td>
              {plans.map((plan) => {
                const benefits = getBenefitsList(plan.benefits);
                
                return (
                  <td key={plan.id} className="p-4">
                    <ul className="space-y-2">
                      {benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{benefit}</span>
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