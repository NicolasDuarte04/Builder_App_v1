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

interface PlanResultsData {
  title: string;
  plans: InsurancePlan[];
  category?: string;
  query?: string;
  timestamp?: Date;
}

interface PlanResultsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentResults?: PlanResultsData | null;
  className?: string;
}

export function PlanResultsSidebar({ 
  isOpen, 
  onClose, 
  currentResults,
  className = "" 
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

  // Update result history when new results come in
  useEffect(() => {
    if (currentResults && currentResults.plans.length > 0) {
      const newResult = {
        ...currentResults,
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
  }, [currentResults]);

  // Get currently active results
  const activeResults = resultHistory[activeResultIndex] || currentResults;

  // Handle plan interactions
  const handleViewDetails = (planId: number) => {
    const plan = activeResults?.plans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('details');
      setIsModalOpen(true);
    }
  };

  const handleQuote = (planId: number) => {
    const plan = activeResults?.plans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setModalMode('quote');
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
          eventBus.emit('plan-pinned', {
            plan: plan,
            pinnedCount: newSet.size + 1
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
  const pinnedPlansList = filteredPlans.filter(plan => pinnedPlans.has(plan.id));
  const unpinnedPlans = filteredPlans.filter(plan => !pinnedPlans.has(plan.id));

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed right-0 top-0 h-full w-96 lg:w-[28rem] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col ${className}`}
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Insurance Results
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

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
                        Pinned Plans
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
                  </div>
                )}

                {/* All Plans Section */}
                {unpinnedPlans.length > 0 && (
                  <div>
                    {pinnedPlansList.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 mb-4" />
                    )}
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      {activeResults.title}
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
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPriceDisplay = (price: number | null | undefined, currency: string) => {
    if (!price || price === 0) {
      return { text: "Según cotización", isQuoteOnly: true };
    }
    return { text: formatPrice(price, currency), isQuoteOnly: false };
  };

  const priceInfo = getPriceDisplay(plan.basePrice, plan.currency);

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
            {plan.name}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {plan.provider}
          </p>
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
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {priceInfo.text}
        </span>
        {!priceInfo.isQuoteOnly && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/mes</span>
        )}
      </div>

      {/* Benefits preview */}
      {plan.benefits && plan.benefits.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {plan.benefits.slice(0, 2).map((benefit, index) => (
              <div key={index} className="flex items-start gap-1">
                <span className="text-green-500 text-xs">•</span>
                <span className="line-clamp-1">{benefit}</span>
              </div>
            ))}
            {plan.benefits.length > 2 && (
              <span className="text-xs text-gray-500">
                +{plan.benefits.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(plan.id)}
          className="flex-1 h-7 text-xs"
        >
          Details
        </Button>
        <Button
          size="sm"
          onClick={() => onQuote(plan.id)}
          className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
        >
          Quote
        </Button>
      </div>
    </motion.div>
  );
}