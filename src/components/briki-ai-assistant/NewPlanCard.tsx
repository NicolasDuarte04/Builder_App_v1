import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, ArrowRight, ExternalLink, Star, TrendingUp, Check } from "lucide-react";
import { Separator } from '../ui/separator';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { translateIfEnglish, translateListIfEnglish, translateCategoryIfEnglish, formatPlanName } from '@/lib/text-translation';


// This interface matches the data coming from the backend AI service
export interface InsurancePlan {
  id: number;
  name: string;
  category: string;
  provider: string;
  basePrice: number;
  currency: string;
  benefits: string[];
  is_external?: boolean;
  external_link?: string | null;
  features?: string[];
  rating?: number;
  tags?: string[];
}


interface NewPlanCardProps {
  plan: InsurancePlan;
  onViewDetails: (planId: number) => void;
  onQuote: (planId: number) => void;
}


const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    minimumFractionDigits: 0,
  }).format(price);
};

const getQuoteLabel = (language: string) =>
  language?.startsWith('es') ? 'Ver en el sitio' : 'See on website';

const getPriceDisplay = (
  price: number | null | undefined,
  currency: string,
  language: string,
  hasExternal: boolean
) => {
  const isZeroOrNull = !price || price === 0;
  if (isZeroOrNull && hasExternal) {
    return { text: getQuoteLabel(language), isQuoteOnly: true };
  }
  if (isZeroOrNull) {
    // Fallback for plans with no price and no external link
    return { text: getQuoteLabel(language), isQuoteOnly: true };
  }
  return { text: formatPrice(price, currency), isQuoteOnly: false };
};


const NewPlanCard: React.FC<NewPlanCardProps> = ({ plan, onViewDetails, onQuote }) => {
  const { language } = useTranslation();
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };


  const handleQuoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (plan.is_external && plan.external_link) {
      window.open(plan.external_link, '_blank', 'noopener,noreferrer');
    } else {
      onQuote(plan.id);
    }
  };

  // Ensure we have valid data
  const safePlan = {
    id: plan.id || 0,
    name: formatPlanName(translateIfEnglish(plan.name || 'Plan de Seguro', language), language),
    provider: plan.provider || 'Proveedor',
    category: translateCategoryIfEnglish(plan.category || 'seguro', language),
    basePrice: plan.basePrice || 0,
    currency: plan.currency || 'COP',
    benefits: translateListIfEnglish(Array.isArray(plan.benefits) ? plan.benefits : [], language),
    rating: plan.rating || 4.0,
    tags: Array.isArray(plan.tags) ? plan.tags : [],
    is_external: plan.is_external !== undefined ? plan.is_external : true,
    external_link: plan.external_link || null,
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className={cn(
        "relative flex flex-col h-full overflow-visible rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-2xl hover:scale-[1.02] transform-gpu transition-all duration-300 border border-gray-100 dark:border-gray-700"
      )}>
        {/* Tags */}
        {safePlan.tags && safePlan.tags.length > 0 && (
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            {safePlan.tags.map(tag => (
              <div key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md">
                <Star className="h-3 w-3" />
                {tag}
              </div>
            ))}
          </div>
        )}


        <CardHeader className="pb-3 pt-4">
          {/* Provider badge */}
          <div className="flex items-center justify-between mb-2">
            <div className='flex items-center gap-2 flex-1'>
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-md bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">
                {safePlan.provider}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {safePlan.category}
              </span>
            </div>
            {safePlan.rating && (
              <div className="flex items-center gap-1 text-sm text-amber-500">
                <Star className="h-4 w-4" />
                <span className="font-bold">{safePlan.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {/* Plan name and secondary external site hint for quote-only */}
          <div className="pr-4">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
              {safePlan.name}
            </CardTitle>
            {(!safePlan.basePrice || safePlan.basePrice === 0) && safePlan.external_link && (
              <a
                href={safePlan.external_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 underline-offset-2 hover:underline"
              >
                {getQuoteLabel(language)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow pb-4">
          {/* Price section - more prominent (hide when quote-only) */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 mb-4">
            <div className="flex items-baseline justify-between">
              <div>
                {(() => {
                  const info = getPriceDisplay(
                    safePlan.basePrice,
                    safePlan.currency,
                    language,
                    !!safePlan.external_link
                  );
                  if (info.isQuoteOnly) {
                    return <span className="text-sm text-gray-500">&nbsp;</span>;
                  }
                  return (
                    <>
                      <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {info.text}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">/mes</span>
                    </>
                  );
                })()}
              </div>
              {safePlan.basePrice && safePlan.basePrice > 0 && safePlan.basePrice < 150000 && (
                <div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  Mejor precio
                </div>
              )}
            </div>
          </div>

          {/* Benefits list - clamp with expandable +N more */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Beneficios principales
            </h4>
            {safePlan.benefits.length > 0 ? (
              <ExpandableBenefits benefits={safePlan.benefits} language={language} />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No hay beneficios listados para este plan.
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700">
          <div className="flex w-full gap-3">
            <Button
              variant="ghost"
              className="flex-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onViewDetails(safePlan.id)}
            >
              Ver detalles
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white shadow-sm hover:shadow-md transition-all"
              onClick={() => onQuote(safePlan.id)}
            >
              Cotizar ahora
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};


// Inline expandable benefits list with 1-line clamp and +N more toggle
function ExpandableBenefits({ benefits, language }: { benefits: string[]; language: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? benefits : benefits.slice(0, 3);
  const remaining = benefits.length - 3;
  return (
    <div>
      <ul className="space-y-2.5">
        {visible.map((benefit, index) => (
          <li key={index} className="flex items-start group">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full p-1 mr-3 flex-shrink-0 mt-0.5 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40 transition-colors">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-1">
              {benefit}
            </span>
          </li>
        ))}
      </ul>
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 pl-7 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600"
        >
          +{remaining} {language?.startsWith('es') ? 'beneficios más' : 'more benefits'}
        </button>
      )}
      {expanded && benefits.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 pl-7 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600"
        >
          {language?.startsWith('es') ? 'Mostrar menos' : 'Show less'}
        </button>
      )}
    </div>
  );
}

export default NewPlanCard; 