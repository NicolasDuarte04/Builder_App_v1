"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin, BookmarkPlus, ArrowRight, Filter, Search } from 'lucide-react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';
import SuggestedPlans from '@/components/briki-ai-assistant/SuggestedPlans';
import { PlanDetailsModal } from './PlanDetailsModal';
import { TemplateCard } from './TemplateCard';
import { TemplatePlanCard } from '@/components/results/TemplatePlanCard';
import { NormalizedPlanCard } from '@/components/results/NormalizedPlanCard';
import { SourcingActions } from '@/components/results/SourcingActions';
import type { TemplatePlan, NormalizedPlan } from '@/types/results';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { eventBus } from '@/lib/event-bus';
import { translateIfEnglish, translateListIfEnglish, formatPlanName } from '@/lib/text-translation';
import { useUIOverlay } from '@/state/uiOverlay';
import { searchPlans } from '@/lib/plans-client-browser';
import { normalizeCategory } from '@/lib/category-alias';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { usePlanResults } from '@/contexts/PlanResultsContext';
import { useCompareStore } from '@/state/compareStore';
import { fromCatalog } from '@/lib/comparison/adapters';
import { useBriefStore } from '@/state/briefStore';
import { useUILayoutStore } from '@/state/uiLayoutStore';
import type { AnyPlan } from '@/types/plan';
import { useAnalyzerUI } from '@/state/analyzerUI';
import { FLAGS } from '@/lib/flags';
import { formatTrustDate } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brief } from '@/types/brief';

// Note: Telemetry deduplication is now handled centrally in showPanelWithPlans

interface NormalizedPrice {
  amountCOPMonthly: number;
  originalAmount: number;
  originalCurrency: string;
  originalPeriod?: string;
  assumptions: string[];
}

interface PlanResultsData {
  title: string;
  plans: InsurancePlan[];
  category?: string;
  query?: string;
  timestamp?: Date;
  filters?: { includeCategories?: string[]; excludeCategories?: string[] };
  dataSource?: string;
  requestId?: string;
  // Template support
  templates?: TemplatePlan[];
  hasRealPlans?: boolean;
  isExactMatch?: boolean;
  noExactMatchesFound?: boolean;
  // Sources support (normalized plans from documents/text)
  sources?: NormalizedPlan[];
  // Analysis results support
  analysis?: any;
  analysisType?: 'policy_analysis';
}

interface PlanResultsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onClosed?: () => void;
  currentResults?: PlanResultsData | null;
  className?: string;
  activeCategory?: string | null;
  country?: string | null;
}

export function PlanResultsSidebar({ 
  isOpen, 
  onClose, 
  onClosed,
  currentResults,
  className = "",
  activeCategory,
  country
}: PlanResultsSidebarProps) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { hideRightPanel, setDualPanelMode, setSidebarOpen } = usePlanResults();
  const clearBriefManualOverride = useUILayoutStore((s) => s.clearBriefManualOverride);
  
  // (CTA moved to QuickActionBar) — no sidebar CTA state needed
  
  // State for plan interactions
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'quote'>('details');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pinnedPlans, setPinnedPlans] = useState<Set<number>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  
  // State for managing multiple result sets
  const [resultHistory, setResultHistory] = useState<PlanResultsData[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  // RESULTS_DRAWN is emitted here once per requestId when the sidebar renders
  const drawnRequestIdsRef = React.useRef<Set<string>>(new Set());

  // Fallback plans state
  const [fallbackPlans, setFallbackPlans] = useState<any[] | null>(null);

  // Fallback logic: if tool result missing, fetch directly
  useEffect(() => {
    let cancelled = false;
    async function maybeFetch() {
      setFallbackPlans(null);
      // Return early if we have any content (plans, templates, or sources)
      if (currentResults && (
        currentResults.plans.length > 0 ||
        (currentResults.templates && currentResults.templates.length > 0) ||
        (currentResults.sources && currentResults.sources.length > 0)
      )) return;
      const cat = normalizeCategory(activeCategory || "");
      if (!cat) return;
      const rows = await searchPlans({ category: cat, country: country || "CO", limit: 12 }).catch(() => []);
      if (!cancelled) setFallbackPlans(rows);
    }
    void maybeFetch();
    return () => { cancelled = true; };
  }, [currentResults, activeCategory, country]);

  // Use fallback plans if tool plans are missing (memoized to avoid new refs each render)
  const effectiveResults = React.useMemo(() => {
    // Use currentResults if we have any content (plans, templates, or sources)
    if (currentResults && (
      currentResults.plans?.length > 0 ||
      (currentResults.templates && currentResults.templates.length > 0) ||
      (currentResults.sources && currentResults.sources.length > 0)
    )) {
      return currentResults;
    }
    
    // Otherwise use fallback plans if available
    return fallbackPlans?.length ? {
      title: `Plans for ${activeCategory || 'selected category'}`,
      plans: fallbackPlans,
      category: activeCategory || undefined,
      timestamp: new Date()
    } : null;
  }, [currentResults, fallbackPlans, activeCategory]);

  // Get currently active results
  const activeResults = resultHistory[activeResultIndex] || effectiveResults;

  // Update result history when new results come in
  useEffect(() => {
    if (effectiveResults && effectiveResults.plans.length > 0) {
      const newResult = {
        ...effectiveResults,
        // keep provided timestamp if exists; otherwise set once here
        timestamp: (effectiveResults as any).timestamp ?? new Date()
      };

      let didAdd = false;

      setResultHistory(prev => {
        // Check if this is a duplicate of the most recent result
        const isDuplicate = prev.length > 0 &&
          prev[0].title === newResult.title &&
          prev[0].category === (newResult as any).category &&
          prev[0].plans.length === newResult.plans.length &&
          prev[0].plans.every((plan, idx) => plan.id === newResult.plans[idx]?.id);

        if (isDuplicate) return prev;

        didAdd = true;
        // Add new result to the beginning, keep last 5 results
        return [newResult, ...prev].slice(0, 5);
      });

      if (didAdd && activeResultIndex !== 0) {
        setActiveResultIndex(0);
      }

      // Note: Telemetry deduplication is now handled centrally
    }
  }, [effectiveResults, activeResultIndex]);

  // Emit RESULTS_DRAWN when the sidebar renders with results (once per requestId)
  useEffect(() => {
    const rid = currentResults?.requestId;
    const hasPlans = (activeResults?.plans?.length || 0) > 0;
    const hasTemplates = (currentResults?.templates?.length || 0) > 0;
    const hasSources = (currentResults?.sources?.length || 0) > 0;
    const hasAny = hasPlans || hasTemplates || hasSources;
    if (!isOpen || !rid || !hasAny) return;
    if (drawnRequestIdsRef.current.has(rid)) return;
    const displayedCount = (activeResults?.plans?.length || 0) + (currentResults?.templates?.length || 0) + (currentResults?.sources?.length || 0);
    const dataSource: 'plans_v2' | 'templates' | 'mixed' = hasTemplates && !hasPlans && !hasSources
      ? 'templates'
      : hasPlans && !hasTemplates && !hasSources
        ? 'plans_v2'
        : 'mixed';
    getUserContext().then(({ sessionId, userId }) => {
      telemetry.track(telemetry.events.RESULTS_DRAWN, {
        requestId: rid!,
        category: currentResults?.category,
        dataSource,
        displayedCount,
        viewMode: 'dual',
        sessionId,
        userId,
      });
      drawnRequestIdsRef.current.add(rid!);
    }).catch(() => {});
  }, [isOpen, currentResults?.requestId, currentResults?.category, activeResults?.plans?.length, currentResults?.templates?.length, currentResults?.sources?.length]);
  // Current brief for fit score in template/normalized adapters
  const sidebarBrief: Brief | null = useBriefStore((s) => s.brief as any);
  
  // Note: TEMPLATES_GENERATED and PRICE_NORMALIZED telemetry are now handled centrally in showPanelWithPlans

  // Handle template usage
  const handleUseTemplate = (template: TemplatePlan) => {
    // Emit template usage event
    eventBus.emit('TEMPLATE_USED', {
      templateId: template.id,
      title: template.title,
      category: activeResults?.category,
      fitScore: template.fitScore
    });
    
    // Track telemetry
    getUserContext().then(({ sessionId, userId }) => {
      telemetry.track('template_used', {
        templateId: template.id,
        title: template.title,
        fitScore: template.fitScore,
        sessionId,
        userId
      });
    });
    
    toast({
      title: t('plans.templateApplied') as string,
      description: `${t('plans.templateApplied') as string} "${template.title}"`,
    });
  };

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
            title: t('assistant.unpin_toast_title'),
            description: t('assistant.unpin_toast_desc').replace('{planName}', plan.name),
          });
          
          // Emit event for assistant
          eventBus.emit('plan-unpinned', {
            plan: plan,
            pinnedCount: newSet.size
          });
        } else {
          newSet.add(planId);
          toast({
            title: t('assistant.pin_toast_title'),
            description: t('assistant.pin_toast_desc').replace('{planName}', plan.name),
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

  // Stable plans list derived from effectiveResults for syncing to compare store
  const stablePlans = React.useMemo(() => effectiveResults?.plans || [], [effectiveResults?.plans]);

  // Defer syncing of pinned plans to the compare store to avoid setState during render
  useEffect(() => {
    try {
      const store = useCompareStore.getState();
      const itemsBefore = store.items;
      const currentCompareIds = new Set<string>(itemsBefore.map(i => i.id));
      const pinnedIdStrings = new Set<string>(Array.from(pinnedPlans).map(id => String(id)));

      // Remove catalog compare items that are no longer pinned
      for (const item of itemsBefore) {
        if (item.source?.kind === 'catalog' && !pinnedIdStrings.has(item.id)) {
          store.remove(item.id);
        }
      }

      // Add newly pinned items by mapping from catalog
      const brief = useBriefStore.getState().brief || undefined;
      const currentAfterIds = new Set<string>(useCompareStore.getState().items.map(i => i.id));
      for (const idStr of Array.from(pinnedIdStrings)) {
        if (!currentAfterIds.has(idStr)) {
          const plan = stablePlans.find(p => String(p.id) === idStr);
          if (!plan) continue;

          const countryCode = (country === 'MX' ? 'MX' : 'CO') as 'CO' | 'MX';
          const categoryValue = (plan as any).category || effectiveResults?.category || 'unknown';
          const anyPlan: AnyPlan = {
            id: String(plan.id),
            name: plan.name,
            provider: plan.provider,
            category: categoryValue,
            country: countryCode,
            base_price: (plan as any).base_price ?? (plan as any).basePrice ?? null,
            currency: (plan as any).currency ?? (plan as any).currency_code ?? 'COP',
            website: (plan as any).website ?? (plan as any).external_link ?? null,
            brochure: (plan as any).brochure ?? (plan as any).brochure_link ?? null,
            benefits: (plan as any).benefits ?? [],
            benefits_en: (plan as any).benefits_en ?? undefined,
            tags: (plan as any).tags ?? undefined,
            _schema: 'legacy',
          } as AnyPlan;

          store.add(fromCatalog(anyPlan, brief as any));
        }
      }
    } catch {}
  }, [pinnedPlans, stablePlans]);

  // [AUDIT] Sidebar render state
  console.log('[AUDIT] Sidebar render: effective', {
    hasPlans: (currentResults?.plans?.length || 0) > 0,
    hasTemplates: (currentResults?.templates?.length || 0) > 0,
    hasSources: (currentResults?.sources?.length || 0) > 0
  });

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
          data-testid="plan-results-sidebar"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('assistant.insurance_results')}
              </h2>
              <div className="flex items-center gap-1">
                {/* Minimize to floating chip */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { 
                    overlay.minimizeResults(); 
                    clearBriefManualOverride(); // Clear manual override when minimizing
                    onClose(); 
                  }}
                  className="h-8 w-8 p-0"
                  aria-label={t('common.minimize')}
                  title={t('common.minimize')}
                >
                  {/* simple minus icon via svg to avoid importing extra */}
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><rect x="4" y="9" width="12" height="2" rx="1"/></svg>
                </Button>
                {/* Close (hide) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose();
                    clearBriefManualOverride(); // Clear manual override when closing sidebar
                    onClosed?.(); // NEW
                  }}
                  className="h-8 w-8 p-0"
                  aria-label={t('common.close')}
                  title={t('common.close')}
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
                    {result.category || t('plans.searchLabel') as string} {index + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Search and Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('assistant.filter_plans')}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* Results summary */}
            {activeResults && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{filteredPlans.length} {t('assistant.plans')}</span>
                {pinnedPlans.size > 0 && (
                  <span className="flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    {pinnedPlans.size} {t('assistant.pinned')}
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
            ) : activeResults.analysisType === 'policy_analysis' ? (
              // Analysis results display
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {activeResults.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Análisis detallado de la póliza PDF
                  </p>
                </div>
                
                {activeResults.analysis && (
                  <div className="space-y-4">
                    {/* Policy Type */}
                    {activeResults.analysis.policyType && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Tipo de Póliza</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{activeResults.analysis.policyType}</p>
                      </div>
                    )}
                    
                    {/* Premium */}
                    {activeResults.analysis.premium && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Prima</h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ${activeResults.analysis.premium.amount?.toLocaleString()} {activeResults.analysis.premium.currency} / {activeResults.analysis.premium.frequency}
                        </p>
                      </div>
                    )}
                    
                    {/* Key Features */}
                    {activeResults.analysis.keyFeatures && activeResults.analysis.keyFeatures.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">Características Clave</h4>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                          {activeResults.analysis.keyFeatures.map((feature: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Recommendations */}
                    {activeResults.analysis.recommendations && activeResults.analysis.recommendations.length > 0 && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Recomendaciones</h4>
                        <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                          {activeResults.analysis.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Risk Score */}
                    {activeResults.analysis.riskScore && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-1">Puntuación de Riesgo</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                            <div 
                              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(activeResults.analysis.riskScore / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            {activeResults.analysis.riskScore}/10
                          </span>
                        </div>
                        {activeResults.analysis.riskJustification && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            {activeResults.analysis.riskJustification}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          You have {pinnedPlansList.length} plans pinned for comparison
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Step-2 analytics: COMPARATOR_OPENED
                              getUserContext().then(({ sessionId, userId }) => {
                                telemetry.track(telemetry.events.COMPARATOR_OPENED, {
                                  count: pinnedPlansList.length,
                                  sessionId,
                                  userId
                                });
                              });
                              
                              // Trigger comparison event with actual pinned plans
                              console.log('🔍 PlanResultsSidebar: Comparison button clicked with pinned plans:', pinnedPlansList);
                              eventBus.emit('comparison:request', { pinnedPlans: pinnedPlansList });
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
                          >
                            {t('assistant.view_comparison_in_chat')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Templates Section */}
                {activeResults?.templates && activeResults.templates.length > 0 && (
                  <div>
                    {pinnedPlansList.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 mb-4" />
                    )}
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Plantillas Sugeridas
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {activeResults.templates.map((template) => (
                        <TemplatePlanCard
                          key={template.id}
                          template={template}
                          onUseTemplate={handleUseTemplate}
                          isCompact={true}
                          brief={sidebarBrief || undefined}
                        />
                      ))}
                    </div>
                    {/* Add sourcing actions after templates */}
                    <div className="mt-4">
                      <SourcingActions
                        onSearchPlans={() => {
                          // Trigger search for real plans
                          console.log('🔍 Search real plans triggered from templates');
                          // You can emit an event or call a function here
                        }}
                        onUploadDocument={() => {
                          // Trigger document upload
                          try { useAnalyzerUI.getState().open('sidebarCTA'); } catch {}
                        }}
                        onWebSearch={() => {
                          // Trigger web search
                          console.log('🌐 Web search triggered from templates');
                          // You can emit an event or call a function here
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Sources Section (normalized plans from documents/text) */}
                {activeResults?.sources && activeResults.sources.length > 0 && (
                  <div>
                    {(pinnedPlansList.length > 0 || (activeResults?.templates && activeResults.templates.length > 0)) && (
                      <div className="border-t border-gray-200 dark:border-gray-700 mb-4" />
                    )}
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Planes de Fuentes Externas
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {activeResults.sources.map((source, index) => (
                        <NormalizedPlanCard
                          key={`source-${index}`}
                          plan={source}
                          onViewSource={(sourceData) => {
                            console.log('📄 View source:', sourceData);
                            // Handle viewing the source document/URL
                          }}
                          onAnalyze={(plan) => {
                            console.log('🔍 Analyze normalized plan:', plan);
                            // Handle analyzing the normalized plan
                          }}
                          isCompact={true}
                          brief={sidebarBrief || undefined}
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
                      {activeResults?.title || (t('plans.results') as string)}
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
                
                {/* No results at all */}
                {filteredPlans.length === 0 && activeResults.plans.length === 0 && 
                 (!activeResults.templates || activeResults.templates.length === 0) &&
                 (!activeResults.sources || activeResults.sources.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No plans, templates, or sources available.
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
  const { t, language } = useTranslation();

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

  const getQuoteLabel = () => t('plans.viewOnWebsite') as string;

  const getPriceDisplay = (
    price: number | null | undefined,
    currency: string,
    hasExternal: boolean
  ) => {
    const isZeroOrNull = !price || price === 0;
    if (isZeroOrNull && hasExternal) {
      return { text: getQuoteLabel(), isQuoteOnly: true };
    }
    if (isZeroOrNull) {
      return { text: getQuoteLabel(), isQuoteOnly: true };
    }
    return { text: formatPrice(price, currency), isQuoteOnly: false };
  };

  // Use normalized price if available and flag is enabled
  const hasNormalizedPrice = FLAGS.currencyNorm && plan.normalizedPrice;
  const displayPrice = hasNormalizedPrice ? plan.normalizedPrice!.amountCOPMonthly : plan.basePrice;
  const displayCurrency = hasNormalizedPrice ? 'COP' : plan.currency;
  
  const priceInfo = getPriceDisplay(displayPrice, displayCurrency, !!plan.external_link);
  const tooltipId = `price-tip-${plan.id}`;
  const perMonthLabel = t('comparison.fields.perMonth');
  const trustEnabled = FLAGS.trustMetadata;
  const trustKind = (plan as any)?.source?.kind || 'catalog';
  const trustUpdatedAt = (plan as any)?.source?.updatedAt || (plan as any)?.updatedAt;
  const trustDateText = formatTrustDate(trustUpdatedAt, language);

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
              {getQuoteLabel()}
            </a>
          )}
        </div>
        <button
          onClick={() => onPin(plan.id)}
          data-testid="pin-toggle"
          aria-pressed={isPinned}
          aria-label={isPinned ? t('assistant.unpin') : t('assistant.pin')}
          className={`p-1 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-gray-800 ${
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
            {hasNormalizedPrice ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="inline-flex items-center cursor-help"
                      aria-describedby={tooltipId}
                      aria-label={t('assistant.price.why')}
                    >
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {priceInfo.text}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{perMonthLabel}</span>
                      <span className="ml-1 text-[10px] text-gray-400" aria-hidden="true">ⓘ</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent id={tooltipId} role="tooltip" className="max-w-xs">
                    <div className="space-y-2 text-xs">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('assistant.price.converted_label')}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {t('assistant.price.original_label')}
                        </div>
                        <div>
                          {t('assistant.price.original_value')
                            .replace('{amount}', new Intl.NumberFormat(undefined, {
                              style: 'currency',
                              currency: plan.normalizedPrice!.originalCurrency,
                              maximumFractionDigits: 2,
                            }).format(plan.normalizedPrice!.originalAmount))
                            .replace('{currency}', String(plan.normalizedPrice!.originalCurrency))}
                        </div>
                        {plan.normalizedPrice!.originalPeriod && plan.normalizedPrice!.originalPeriod !== 'monthly' && (
                          <div>
                            {t('assistant.price.assumed_period').replace('{period}', String(plan.normalizedPrice!.originalPeriod))}
                          </div>
                        )}
                        {(() => {
                          const rate = (plan as any)?.normalizedPrice?.rate ?? (plan as any)?.normalizedPrice?.exchangeRate;
                          if (rate === undefined || rate === null) return null;
                          const rateText = typeof rate === 'number'
                            ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(rate)
                            : String(rate);
                          return (
                            <div>
                              {t('assistant.price.rate_used').replace('{rate}', rateText)}
                            </div>
                          );
                        })()}
                      </div>
                      {plan.normalizedPrice!.assumptions.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {t('assistant.price.why')}
                          </div>
                          {plan.normalizedPrice!.assumptions.map((assumption, idx) => (
                            <div key={idx} className="text-gray-500">• {assumption}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {priceInfo.text}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{perMonthLabel}</span>
              </>
            )}
          </>
        ) : null}
      </div>

      {/* Trust metadata */}
      {trustEnabled && trustKind && trustDateText && (
        <div className="mb-2 text-[11px] text-gray-500 dark:text-gray-400" data-testid="plan-trust-meta">
          {String(t('assistant.trust.source'))}: {trustKind} • {String(t('assistant.trust.updated'))}: {trustDateText}
        </div>
      )}

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
            {t('plans.details') as string}
          </Button>
          <Button
            size="sm"
            onClick={() => onQuote(plan.id)}
            className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
          >
            {t('plans.quote') as string}
          </Button>
          {((plan as any).brochure_link || (plan as any).brochure) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              asChild
            >
              <a href={(plan as any).brochure_link || (plan as any).brochure} target="_blank" rel="noopener noreferrer">
                {t('plans.brochure') as string}
              </a>
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SidebarExpandableBenefits({ benefits, language }: { benefits: string[]; language: string }) {
  const { t } = useTranslation();
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
          +{remaining} {t('plans.more') as string}
        </button>
      )}
      {expanded && benefits.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600"
        >
          {t('plans.showLess') as string}
        </button>
      )}
    </div>
  );
}