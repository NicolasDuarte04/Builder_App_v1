"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin, BookmarkPlus, ArrowRight, Filter, Search } from 'lucide-react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';
import SuggestedPlans from '@/components/briki-ai-assistant/SuggestedPlans';
import { PlanDetailsModal } from './PlanDetailsModal';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { eventBus } from '@/lib/event-bus';
import { translateIfEnglish, translateListIfEnglish, formatPlanName } from '@/lib/text-translation';
import { useUIOverlay } from '@/state/uiOverlay';
import { searchPlans } from '@/lib/plans-client-browser';
import { normalizeCategory } from '@/lib/category-alias';

interface PlanResultsData {
  title: string;
  plans: InsurancePlan[];
  category?: string;
  query?: string;
  timestamp?: Date;
  filters?: { includeCategories?: string[]; excludeCategories?: string[] };
  dataSource?: string;
}

interface PlanResultsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentResults?: PlanResultsData | null;
  className?: string;
  activeCategory?: string | null;
  country?: string | null;
}

export function PlanResultsSidebar({ 
  isOpen, 
  onClose, 
  currentResults,
  className = "",
  activeCategory,
  country
}: PlanResultsSidebarProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // State for plan interactions
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'quote'>('details');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pinnedPlans, setPinnedPlans] = useState<Set<number>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  
  // State for managing multiple result sets
  const [resultHistory, setResultHistory] = useState<PlanResultsData[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // Fallback plans state
  const [fallbackPlans, setFallbackPlans] = useState<any[] | null>(null);

  // Fallback logic: if tool result missing, fetch directly
  useEffect(() => {
    let cancelled = false;
    async function maybeFetch() {
      setFallbackPlans(null);
      if (currentResults && currentResults.plans.length > 0) return;
      const cat = normalizeCategory(activeCategory || "");
      if (!cat) return;
      const rows = await searchPlans({ category: cat, country: country || "CO", limit: 12 }).catch(() => []);
      if (!cancelled) setFallbackPlans(rows);
    }
    void maybeFetch();
    return () => { cancelled = true; };
  }, [currentResults, activeCategory, country]);

  // Use fallback plans if tool plans are missing
  const effectiveResults = currentResults?.plans?.length ? currentResults : 
    fallbackPlans?.length ? { 
      title: `Plans for ${activeCategory || 'selected category'}`, 
      plans: fallbackPlans,
      category: activeCategory,
      timestamp: new Date()
    } : null;

  // Update result history when new results come in
  useEffect(() => {
    if (effectiveResults && effectiveResults.plans.length > 0) {
      const newResult = {
        ...effectiveResults,
        timestamp: new Date()
      };
      
      setResultHistory(prev => {
        // Check if this is a duplicate of the most recent result
        const isDuplicate = prev.length > 0 && 
          prev[0].title === newResult.title &&
          prev[0].plans.length === newResult.plans.length &&
          prev[0].plans.every((plan, idx) => plan.id === newResult.plans[idx]?.id);
        
        if (isDuplicate) return prev;
        
        // Add new result to the beginning, keep last 5 results
        return [newResult, ...prev].slice(0, 5);
      });
      
      setActiveResultIndex(0);
    }
  }, [effectiveResults]);

  // Get currently active results
  const activeResults = resultHistory[activeResultIndex] || effectiveResults;

  // Handle plan interactions
  const handleViewDetails = (planId: number) => {
    const plan = activeResults?.plans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('details');
      // remember and minimize drawer so it doesn't collide
      prevResultsStateRef.current = overlay.resultsState;
      overlay.minimizeResults();
      setIsModalOpen(true);
    }
  };

  const handleQuote = (planId: number) => {
    const plan = activeResults?.plans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('quote');
      prevResultsStateRef.current = overlay.resultsState;
      overlay.minimizeResults();
      setIsModalOpen(true);
    }
  };

  const handlePinPlan = (planId: number) => {
    const plan = activeResults?.plans.find(p => p.id === planId);
    if (plan) {
      setPinnedPlans(prev => {
        const newSet = new Set(prev);
        if (newSet.has(planId)) {
          newSet.delete(planId);
          toast({
            title: "Plan unpinned",
            description: `${plan.name} removed from pinned plans`,
          });
          
          // Emit event for assistant
          eventBus.emit('plan-unpinned', {
            plan: plan,
            pinnedCount: newSet.size
          });
        } else {
          newSet.add(planId);
          toast({
            title: "Plan pinned",
            description: `${plan.name} added to pinned plans`,
          });
          
          // Emit event for assistant
          // Use the actual current size after adding (no +1)
          eventBus.emit('plan-pinned', {
            plan: plan,
            pinnedCount: newSet.size
          });
        }
        return newSet;
      });
    }
  };

  // Filter plans based on search
  const filteredPlans = React.useMemo(() => {
    if (!activeResults?.plans || !searchFilter.trim()) {
      return activeResults?.plans || [];
    }
    
    const filter = searchFilter.toLowerCase();
    return activeResults.plans.filter(plan => 
      plan.name.toLowerCase().includes(filter) ||
      plan.provider.toLowerCase().includes(filter) ||
      plan.benefits?.some(benefit => benefit.toLowerCase().includes(filter))
    );
  }, [activeResults?.plans, searchFilter]);

  // Get pinned and unpinned plans
  const pinnedPlansList = React.useMemo(() => filteredPlans.filter(plan => pinnedPlans.has(plan.id)), [filteredPlans, pinnedPlans]);
  const unpinnedPlans = React.useMemo(() => filteredPlans.filter(plan => !pinnedPlans.has(plan.id)), [filteredPlans, pinnedPlans]);

  // Dev-only render log to avoid console spam in production
  if (process.env.NODE_ENV !== 'production') {
    // keep it lightweight; avoid stringifying large arrays
    console.log('[PlanResultsSidebar] Rendering:', { isOpen, count: currentResults?.plans?.length ?? 0 });
  }

  const overlay = useUIOverlay();
  const prevResultsStateRef = React.useRef<typeof overlay.resultsState | null>(null);

  // Restore drawer state when modal closes
  useEffect(() => {
    if (isModalOpen) return;
    if (!prevResultsStateRef.current) return;
    const prev = prevResultsStateRef.current;
    if (prev === 'open') overlay.openResults();
    if (prev === 'minimized') overlay.minimizeResults();
    if (prev === 'hidden') overlay.hideResults();
    prevResultsStateRef.current = null;
  }, [isModalOpen, overlay]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 220 }}
          className={`fixed right-0 top-0 h-full w-96 lg:w-[28rem] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-[70] flex flex-col ${className}`}
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Insurance Results
              </h2>
              <div className="flex items-center gap-1">
                {/* Minimize to floating chip */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { overlay.minimizeResults(); onClose(); }}
                  className="h-8 w-8 p-0"
                  aria-label="Minimize results panel"
                  title="Minimize"
                >
                  {/* simple minus icon via svg to avoid importing extra */}
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><rect x="4" y="9" width="12" height="2" rx="1"/></svg>
                </Button>
                {/* Close (hide) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                  aria-label="Close results panel"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Hide filter debug for end users; can be re-enabled via explicit flag only */}
            {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SHOW_FILTER_DEBUG === 'true' && (
              <div className="mb-2 text-[11px] text-gray-500">
                <span>
                  Filtered by: include=[{activeResults?.filters?.includeCategories?.join(', ') || ''}] exclude=[{activeResults?.filters?.excludeCategories?.join(', ') || ''}] • datasource={activeResults?.dataSource || (process.env.NEXT_PUBLIC_BRIKI_DATA_SOURCE || 'legacy')}
                </span>
              </div>
            )}

            {/* Result History Tabs */}
            {resultHistory.length > 1 && (
              <div className="flex gap-1 mb-4">
                {resultHistory.slice(0, 3).map((result, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveResultIndex(index)}
                    className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                      activeResultIndex === index
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {result.category || 'Search'} {index + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Search and Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filter plans..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* Results summary */}
            {activeResults && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{filteredPlans.length} plans found</span>
                {pinnedPlans.size > 0 && (
                  <span className="flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    {pinnedPlans.size} pinned
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {!activeResults ? (
              // Empty state
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No insurance results yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  Ask the AI assistant about insurance plans and the results will appear here for easy comparison and interaction.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {/* Pinned Plans Section */}
                {pinnedPlansList.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Pin className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Pinned Plans ({pinnedPlansList.length})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {pinnedPlansList.map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          onViewDetails={handleViewDetails}
                          onQuote={handleQuote}
                          onPin={handlePinPlan}
                          isPinned={true}
                          isCompact={true}
                        />
                      ))}
                    </div>
                    {pinnedPlansList.length >= 2 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                          You have {pinnedPlansList.length} plans pinned for comparison
                        </p>
                        <button
                          onClick={() => {
                            // Trigger comparison event with actual pinned plans
                            console.log('🔍 PlanResultsSidebar: Comparison button clicked with pinned plans:', pinnedPlansList);
                            eventBus.emit('comparison:request', { pinnedPlans: pinnedPlansList });
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
                        >
                          View Comparison in Chat
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* All Plans Section */}
                {unpinnedPlans.length > 0 && (
                  <div>
                    {pinnedPlansList.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 mb-4" />
                    )}
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      {activeResults?.title || (useTranslation().language?.startsWith('es') ? 'Resultados' : 'Results')}
                    </h3>
                    <div className="space-y-3">
                      {unpinnedPlans.map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          onViewDetails={handleViewDetails}
                          onQuote={handleQuote}
                          onPin={handlePinPlan}
                          isPinned={false}
                          isCompact={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No results after filtering */}
                {filteredPlans.length === 0 && activeResults.plans.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No plans match your filter criteria.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Plan Details Modal */}
      <PlanDetailsModal
        plan={selectedPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
      />
    </>
  );
}

// Compact Plan Card Component for Sidebar
interface PlanCardProps {
  plan: InsurancePlan;
  onViewDetails: (planId: number) => void;
  onQuote: (planId: number) => void;
  onPin: (planId: number) => void;
  isPinned: boolean;
  isCompact?: boolean;
}

function PlanCard({ plan, onViewDetails, onQuote, onPin, isPinned, isCompact = false }: PlanCardProps) {
  const { language } = useTranslation();

  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: (currency as any) || 'COP',
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      return `${price.toFixed(2)} ${currency || 'COP'}`;
    }
  };

  const getQuoteLabel = (lang: string) => (lang?.startsWith('es') ? 'Ver en el sitio' : 'See on website');

  const getPriceDisplay = (
    price: number | null | undefined,
    currency: string,
    hasExternal: boolean
  ) => {
    const isZeroOrNull = !price || price === 0;
    if (isZeroOrNull && hasExternal) {
      return { text: getQuoteLabel(language), isQuoteOnly: true };
    }
    if (isZeroOrNull) {
      return { text: getQuoteLabel(language), isQuoteOnly: true };
    }
    return { text: formatPrice(price, currency), isQuoteOnly: false };
  };

  const priceInfo = getPriceDisplay(plan.basePrice, plan.currency, !!plan.external_link);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {formatPlanName(translateIfEnglish(plan.name, language), language)}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {plan.provider}
          </p>
          {(!plan.basePrice || plan.basePrice === 0) && (plan.external_link || (plan as any).website) && (
            <a
              href={plan.external_link || (plan as any).website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 underline-offset-2 hover:underline"
            >
              {getQuoteLabel(language)}
            </a>
          )}
        </div>
        <button
          onClick={() => onPin(plan.id)}
          className={`p-1 rounded-md transition-colors ${
            isPinned 
              ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' 
              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
        >
          <Pin className="h-3 w-3" />
        </button>
      </div>

      {/* Price */}
      <div className="mb-2">
        {!priceInfo.isQuoteOnly ? (
          <>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {priceInfo.text}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/mes</span>
          </>
        ) : null}
      </div>

      {/* Benefits preview */}
      {plan.benefits && plan.benefits.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <SidebarExpandableBenefits benefits={translateListIfEnglish(plan.benefits, language)} language={language} />
          </div>
        </div>
      )}

      {/* Actions - Only show for unpinned plans */}
      {!isPinned && (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(plan.id)}
            className="flex-1 h-7 text-xs"
          >
            {language?.startsWith('es') ? 'Detalles' : 'Details'}
          </Button>
          <Button
            size="sm"
            onClick={() => onQuote(plan.id)}
            className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
          >
            {language?.startsWith('es') ? 'Cotizar' : 'Quote'}
          </Button>
          {((plan as any).brochure_link || (plan as any).brochure) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              asChild
            >
              <a href={(plan as any).brochure_link || (plan as any).brochure} target="_blank" rel="noopener noreferrer">
                {language?.startsWith('es') ? 'Folleto' : 'Brochure'}
              </a>
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SidebarExpandableBenefits({ benefits, language }: { benefits: string[]; language: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? benefits : benefits.slice(0, 2);
  const remaining = Math.max(benefits.length - 2, 0);
  return (
    <div>
      {visible.map((benefit, index) => (
        <div key={index} className="flex items-start gap-1">
          <span className="text-green-500 text-xs">•</span>
          <span className="line-clamp-1">{benefit}</span>
        </div>
      ))}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600"
        >
          +{remaining} {language?.startsWith('es') ? 'más' : 'more'}
        </button>
      )}
      {expanded && benefits.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600"
        >
          {language?.startsWith('es') ? 'Mostrar menos' : 'Show less'}
        </button>
      )}
    </div>
  );
}