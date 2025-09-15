"use client";

import React, { useState, useRef, KeyboardEvent, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBriefStore } from '@/state/briefStore';
import { useUILayoutStore } from '@/state/uiLayoutStore';
import { setManualOverride } from '@/components/assistant/AIAssistantInterface';
import { useTranslation } from '@/hooks/useTranslation';
import { presetsFor } from '@/lib/coverage-presets';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { useUiPhase } from '@/state/proposal';
import { useCompareStore } from '@/state/compareStore';
import { Check, Loader2, AlertTriangle, X, Plus, FileText, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCY_RATES } from '@/lib/currency-normalization';
import { normalizeCoverage } from '@/lib/coveragesMap';
import { useShallow } from 'zustand/react/shallow';
import { getFFCategoryChooser } from '@/lib/flags';
import { CategoryChooser } from './CategoryChooser';

// Helper para emitir BRIEF_FIELDS_UPDATED desde UI (debounced, dev-safe)
let lastEmissionTime = 0;
const EMISSION_DEBOUNCE_MS = 100; // Evitar duplicados si el store ya emitió

const emitFieldsUpdated = async (telemetry: any, getCounts: () => {fieldsFilled:number,totalFields:number,fieldNames:string[]}) => {
  try {
    const now = Date.now();
    // Skip si ya se emitió recientemente (posible duplicado del store)
    if (now - lastEmissionTime < EMISSION_DEBOUNCE_MS) {
      return;
    }
    
    const { sessionId, userId } = await getUserContext();
    const { fieldsFilled, totalFields, fieldNames } = getCounts();
    telemetry.track(telemetry.events.BRIEF_FIELDS_UPDATED, {
      fieldsFilled, totalFields, fieldNames,
      source: 'manual',
      sessionId, userId,
    });
    
    lastEmissionTime = now;
  } catch {}
};

interface BriefPanelProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseMode?: 'inplace' | 'window';
}

const CATEGORY_OPTIONS = [
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'salud', label: 'Salud' },
  { value: 'viajes', label: 'Viajes' },
  { value: 'vida', label: 'Vida' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'pyme', label: 'PYME' },
] as const;


export function BriefPanel({ className, isCollapsed = false, onToggleCollapse, collapseMode = 'window' }: BriefPanelProps) {
  const [showCategoryChooser, setShowCategoryChooser] = useState(false);
  const { t, language } = useTranslation();
  const { setBriefCollapsed } = useUILayoutStore(
    useShallow((s) => ({
      setBriefCollapsed: s.setBriefCollapsed,
    }))
  );
  
  // Get uiPhase and compareCount for telemetry
  const uiPhase = useUiPhase();
  const compareItemsCount = useCompareStore(state => state.items.length);
  
  // Memoized store selectors to prevent unnecessary re-renders
  const brief = useBriefStore(s => s.brief);
  const category = useBriefStore(s => s.brief?.category);
  const maxBudgetCop = useBriefStore(s => s.brief?.maxBudgetCop);
  const budgetCurrency = (useBriefStore(s => s.brief?.budgetCurrency) as 'COP'|'USD'|undefined) || 'COP';
  const clientPersona = useBriefStore(s => s.brief?.clientPersona);
  const notes = useBriefStore(s => s.brief?.notes);
  const mustHaveCoverages = useBriefStore(s => s.brief?.mustHaveCoverages);
  const isApplied = useBriefStore(s => s.brief?.isApplied);
  
  // Store actions
  const setBrief = useBriefStore(s => s.setBrief);
  const updateBrief = useBriefStore(s => s.updateBrief);
  const [budgetInput, setBudgetInput] = useState<string>('');

  // Sync visible input with store (store keeps COP always)
  useEffect(() => {
    if (typeof maxBudgetCop === 'number' && Number.isFinite(maxBudgetCop)) {
      if (budgetCurrency === 'USD') {
        const rate = Number(CURRENCY_RATES.USD_TO_COP || 4200);
        const usd = Math.round(maxBudgetCop / (rate || 1));
        setBudgetInput(String(usd));
      } else {
        setBudgetInput(String(Math.round(maxBudgetCop)));
      }
    } else {
      setBudgetInput('');
    }
  }, [maxBudgetCop, budgetCurrency]);

  const applyBrief = useBriefStore(s => s.applyBrief);
  const isSaving = useBriefStore(s => s.isSaving);
  const isDirty = useBriefStore(s => s.isDirty);
  const saving = useBriefStore(s => s.saving);
  const lastSavedAt = useBriefStore(s => s.lastSavedAt);
  const authRequired = useBriefStore(s => s.authRequired);

  const [newCoverage, setNewCoverage] = useState('');
  const newCoverageInputRef = useRef<HTMLInputElement>(null);

  // Helper para obtener conteos de campos usando la misma lógica que el store
  const getBriefFieldCounts = useCallback(() => {
    if (!brief) return { fieldsFilled: 0, totalFields: 0, fieldNames: [] };
    return telemetry.metrics.countBriefFields(brief);
  }, [brief]);

  // Stable normalization for category select value (lowercase, no diacritics)
  const normalize = (s?: string|null) => s ? s.normalize('NFD').replace(/\p{Diacritic}+/gu,'').toLowerCase() : '';
  const categoryKey = normalize(brief?.category);

  // Memoized brief initialization to prevent loops
  const initializeBrief = useCallback(() => {
    if (!brief) {
      const newBrief = {
        id: `brief-${Date.now()}`,
        userId: 'guest-user',
        sessionId: 'temp-session',
        locale: 'es' as const,
        source: 'manual' as const,
        category: null as any,
        maxBudgetCop: null,
        budgetCurrency: 'COP' as const,
        mustHaveCoverages: [],
        clientPersona: '',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isApplied: false,
        docRefs: [],
      };
      setBrief(newBrief);
    }
  }, [brief, setBrief]);

  // Memoized handlers to prevent re-creation and loops
  const handleCategoryChange = useCallback((value: string) => {
    initializeBrief();
    const label = CATEGORY_OPTIONS.find(o => o.value === value)?.label;
    if (!label || brief?.category === label) return;
    updateBrief({ category: label as any }, { field: 'category' });
    
    // Emit BRIEF_FIELDS_UPDATED from UI layer
    setTimeout(() => emitFieldsUpdated(telemetry, getBriefFieldCounts).catch(() => {}), 10);
  }, [brief?.category, initializeBrief, updateBrief, getBriefFieldCounts]);

  const handleBudgetChange = useCallback((value: string) => {
    setBudgetInput(value);
    const raw = value === '' ? null : Number(value);
    const parsed = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;

    // Calculate COP to store
    let nextCop: number | null = null;
    if (parsed != null) {
      if (budgetCurrency === 'USD') {
        const rate = Number(CURRENCY_RATES.USD_TO_COP || 4200);
        nextCop = Math.round(parsed * (rate || 1));
      } else {
        nextCop = Math.round(parsed);
      }
    }

    // Only update if value actually changed
    if (nextCop === maxBudgetCop) return;

    initializeBrief();
    updateBrief({ maxBudgetCop: nextCop }, { field: 'maxBudgetCop' });

    // Emit BRIEF_FIELDS_UPDATED from UI layer
    setTimeout(() => emitFieldsUpdated(telemetry, getBriefFieldCounts).catch(() => {}), 10);
  }, [budgetCurrency, maxBudgetCop, initializeBrief, updateBrief, getBriefFieldCounts]);

  const handleCurrencyChange = useCallback((newCurrency: 'COP'|'USD') => {
    if (newCurrency === budgetCurrency) return;
    initializeBrief();
    updateBrief({ budgetCurrency: newCurrency }, { field: 'budgetCurrency' });
    // Re-sync visible input from current COP value
    const rate = Number(CURRENCY_RATES.USD_TO_COP || 4200);
    if (typeof maxBudgetCop === 'number' && Number.isFinite(maxBudgetCop)) {
      if (newCurrency === 'USD') {
        const usd = Math.round(maxBudgetCop / (rate || 1));
        setBudgetInput(String(usd));
      } else {
        setBudgetInput(String(Math.round(maxBudgetCop)));
      }
    }
  }, [budgetCurrency, initializeBrief, updateBrief, maxBudgetCop]);

  const handleClientPersonaChange = useCallback((value: string) => {
    // Only update if value actually changed
    if (value === (clientPersona ?? '')) return;
    
    initializeBrief();
    updateBrief({ clientPersona: value }, { field: 'clientPersona' });
    
    // Emit BRIEF_FIELDS_UPDATED from UI layer
    setTimeout(() => emitFieldsUpdated(telemetry, getBriefFieldCounts).catch(() => {}), 10);
  }, [clientPersona, initializeBrief, updateBrief, getBriefFieldCounts]);

  const handleNotesChange = useCallback((value: string) => {
    // Only update if value actually changed
    if (value === (notes ?? '')) return;
    
    initializeBrief();
    updateBrief({ notes: value }, { field: 'notes' });
    
    // Emit BRIEF_FIELDS_UPDATED from UI layer
    setTimeout(() => emitFieldsUpdated(telemetry, getBriefFieldCounts).catch(() => {}), 10);
  }, [notes, initializeBrief, updateBrief, getBriefFieldCounts]);

  // Memoized coverage handlers
  const addCoverage = useCallback((coverage: string) => {
    if (!coverage.trim()) return;
    
    initializeBrief();
    const currentCoverages = mustHaveCoverages || [];
    const trimmedCoverage = normalizeCoverage(coverage);
    
    // Check if coverage already exists (case-insensitive)
    if (!currentCoverages.some(c => c.toLowerCase() === trimmedCoverage)) {
      updateBrief({ 
        mustHaveCoverages: [...currentCoverages, trimmedCoverage] 
      }, { field: 'mustHaveCoverages' });
      
      // Emit BRIEF_FIELDS_UPDATED from UI layer
      setTimeout(() => emitFieldsUpdated(telemetry, getBriefFieldCounts), 10);
    }
    
    setNewCoverage('');
  }, [mustHaveCoverages, initializeBrief, updateBrief, getBriefFieldCounts]);

  const toggleCoverage = useCallback((coverage: string) => {
    const trimmedCoverage = normalizeCoverage(coverage);
    const currentCoverages = mustHaveCoverages || [];
    const existingIndex = currentCoverages.findIndex(c => c.toLowerCase() === trimmedCoverage);
    const updatedCoverages = existingIndex >= 0
      ? currentCoverages.filter((_, i) => i !== existingIndex)
      : [...currentCoverages, trimmedCoverage];

    initializeBrief();
    updateBrief({ mustHaveCoverages: updatedCoverages }, { field: 'mustHaveCoverages' });
    setTimeout(() => emitFieldsUpdated(telemetry, getBriefFieldCounts).catch(() => {}), 10);
  }, [mustHaveCoverages, initializeBrief, updateBrief, getBriefFieldCounts]);

  const removeCoverage = useCallback((index: number) => {
    if (!mustHaveCoverages) return;
    
    const updatedCoverages = mustHaveCoverages.filter((_, i) => i !== index);
    updateBrief({ 
      mustHaveCoverages: updatedCoverages 
    }, { field: 'mustHaveCoverages' });
    
    // Emit BRIEF_FIELDS_UPDATED from UI layer
    setTimeout(() => emitFieldsUpdated(telemetry, getBriefFieldCounts).catch(() => {}), 10);
  }, [mustHaveCoverages, updateBrief, getBriefFieldCounts]);

  // Memoized pill handlers
  const handleQuickPillClick = useCallback(async (coverage: string) => {
    toggleCoverage(coverage);
    
    // Track telemetry
    const { sessionId, userId } = await getUserContext();
    telemetry.track(telemetry.events.COVERAGE_SUGGESTION_CLICKED, {
      coverage,
      category: category || 'unknown',
      sessionId,
      userId
    });
  }, [toggleCoverage, category]);

  const handlePillKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, coverage: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCoverage(coverage);
    }
  }, [toggleCoverage]);

  // Memoized computed values
  const currentPresets = useMemo(() => presetsFor(category || undefined), [category]);
  
  const allSuggestionsSelected = useMemo(() => {
    if (!mustHaveCoverages) return false;
    return currentPresets.every(preset => 
      mustHaveCoverages.some(selected => 
        selected.toLowerCase() === preset.toLowerCase()
      )
    );
  }, [mustHaveCoverages, currentPresets]);

  const noCategorySelected = !category;

  // QA probe (temporary): log mode changes
  useEffect(() => {
    try { console.debug('[brief] collapseMode', collapseMode, 'collapsed?', !!isCollapsed); } catch {}
  }, [collapseMode, isCollapsed]);

  // Memoized event handlers
  const handleNewCoverageKeyPress = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCoverage(newCoverage);
    }
  }, [addCoverage, newCoverage]);

  const handleApplyToggle = useCallback((checked: boolean) => {
    if (!brief) return;
    
    // Only update if value actually changed
    if (checked === (isApplied ?? false)) return;
    
    updateBrief({ isApplied: checked }, { field: 'isApplied' });
    if (checked) {
      applyBrief();
    }
  }, [brief, isApplied, updateBrief, applyBrief]);

  // Memoized document handlers
  const removeDocument = useCallback((docRef: string) => {
    if (!brief?.docRefs) return;
    
    const updatedDocRefs = brief.docRefs.filter(doc => doc.ref !== docRef);
    updateBrief({ docRefs: updatedDocRefs }, { field: 'docRefs' });
  }, [brief?.docRefs, updateBrief]);

  const previewDocument = useCallback((docRef: any) => {
    // TODO: Implement PDF viewer integration
    console.log('Preview document:', docRef);
  }, []);

  // Autosave status badge
  const AutosaveBadge = () => {
    if (authRequired) {
      return null;
    }
    
    // Helper to get status text for ARIA
    const getStatusText = () => {
      if (isSaving) return t('brief.badge.saving') as string;
      if (saving === 'error') return t('brief.badge.error') as string;
      if (lastSavedAt && !isDirty) {
        const savedTime = new Date(lastSavedAt).toLocaleTimeString(language, {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${t('brief.badge.saved') as string} ${savedTime}`;
      }
      return '';
    };

    // Update ARIA live region
    useEffect(() => {
      const status = getStatusText();
      if (status) {
        window.dispatchEvent(new CustomEvent('briki:toast-live', { 
          detail: { message: status }
        }));
      }
    }, [isSaving, saving, lastSavedAt, isDirty]);
    
    if (isSaving) {
      return (
        <Badge variant="secondary" className="gap-1" data-testid="autosave-badge">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('brief.badge.saving') as any}
        </Badge>
      );
    }
    
    if (saving === 'error') {
      return (
        <Badge variant="destructive" className="gap-1" data-testid="autosave-badge">
          <AlertTriangle className="h-3 w-3" />
          {t('brief.badge.error') as any}
        </Badge>
      );
    }
    
    if (lastSavedAt && !isDirty) {
      const savedTime = new Date(lastSavedAt).toLocaleTimeString(language, {
        hour: '2-digit',
        minute: '2-digit'
      });
      return (
        <Badge variant="secondary" className="gap-1" data-testid="autosave-badge">
          <Check className="h-3 w-3" />
          {`${t('brief.badge.saved') as any} ${savedTime}`}
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <Card className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <CardTitle>{t('brief.title') as any}</CardTitle>
          {brief?.source === 'paste' && (
            <Badge variant="secondary" data-testid="brief-source-chip-paste">
              {t('brief.source.paste') as any}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutosaveBadge />
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isCollapsed) {
                  setManualOverride('expanded');
                  setBriefCollapsed(false);
                } else {
                  setManualOverride('collapsed');
                  setBriefCollapsed(true);
                }
                
                // Emit normalized telemetry for manual toggle
                telemetry.track(telemetry.events.UI_LAYOUT_CHANGED, {
                  area: 'brief',
                  collapsed: !isCollapsed,
                  reason: 'manual',
                  uiPhase,
                  compareCount: compareItemsCount,
                });
              }}
              className="h-8 w-8 p-0"
              aria-label={isCollapsed ? (t('brief.aria.expand') as string) : (t('brief.aria.collapse') as string)}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <div
        data-testid="brief-body"
        className={cn(
          collapseMode === 'inplace' ? "transition-all duration-200 overflow-hidden" : "",
          collapseMode === 'inplace' && isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : (collapseMode === 'inplace' ? "max-h-[2000px] opacity-100" : "")
        )}
        aria-hidden={collapseMode === 'inplace' ? isCollapsed : undefined}
      >
      {(collapseMode === 'inplace' || !isCollapsed) && (
        <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category">{t('brief.category_label') as any}</Label>
          <Select
            value={categoryKey || ''}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger id="category" data-testid="brief-category-select">
              <SelectValue placeholder={t('brief.select_category') as any} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="budget">{t('brief.budget_label') as any}</Label>
            <div className="flex gap-1" role="group" aria-label="Currency">
              <Button
                type="button"
                variant={budgetCurrency === 'COP' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleCurrencyChange('COP')}
                aria-pressed={budgetCurrency === 'COP'}
              >
                COP
              </Button>
              <Button
                type="button"
                variant={budgetCurrency === 'USD' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleCurrencyChange('USD')}
                aria-pressed={budgetCurrency === 'USD'}
              >
                USD
              </Button>
            </div>
          </div>
          <Input
            id="budget"
            type="number"
            placeholder={
              budgetCurrency === 'USD'
                ? String(Math.round(Number(300000) / Number(CURRENCY_RATES.USD_TO_COP || 4200)))
                : (t('brief.budget_placeholder') as any)
            }
            value={budgetInput}
            onChange={(e) => handleBudgetChange(e.target.value)}
            data-testid="brief-budget-input"
          />
          <p className="text-xs text-muted-foreground">
            {t('brief.budget_hint') as any}
          </p>
        </div>

        {/* Must Have Coverages */}
        <div className="space-y-2">
          <Label>{t('brief.must_have_label') as any}</Label>
          
          {/* Current coverages */}
          {mustHaveCoverages && mustHaveCoverages.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {mustHaveCoverages.map((coverage, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {coverage}
                  <button
                    type="button"
                    onClick={() => removeCoverage(index)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                    aria-label={`Eliminar ${coverage}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {/* Add new coverage */}
          <div className="flex gap-2">
            <Input
              ref={newCoverageInputRef}
              placeholder={t('brief.add_coverage_placeholder') as any}
              value={newCoverage}
              onChange={(e) => setNewCoverage(e.target.value)}
              onKeyPress={handleNewCoverageKeyPress}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => addCoverage(newCoverage)}
              disabled={!newCoverage.trim()}
              aria-label={t('brief.add_coverage') as any}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick add pills */}
          {!allSuggestionsSelected && (
            <div className="space-y-2">
              {noCategorySelected ? (
                <p className="text-xs text-muted-foreground">
                  {t('brief.select_category_for_coverages_hint') as any}
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{t('brief.common_coverages') as any}</p>
                  <div className="flex flex-wrap gap-1">
                    {currentPresets.map((coverage) => {
                      const isSelected = mustHaveCoverages?.some(c => 
                        c.toLowerCase() === coverage.toLowerCase()
                      );
                      
                      return (
                        <button
                          key={coverage}
                          type="button"
                          onClick={() => handleQuickPillClick(coverage)}
                          onKeyDown={(e) => handlePillKeyDown(e, coverage)}
                          className={cn(
                            "px-2 py-1 text-xs border rounded-full transition-colors",
                            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            isSelected && "bg-muted"
                          )}
                          aria-pressed={isSelected}
                          aria-label={`${t('brief.add_coverage') as any} ${coverage}`}
                        >
                          {coverage}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Client Persona */}
        <div className="space-y-2">
          <Label htmlFor="clientPersona">{t('brief.persona_label') as any}</Label>
          <Input
            id="clientPersona"
            placeholder={t('brief.persona_placeholder') as any}
            value={brief?.clientPersona ?? ''}
            onChange={(e) => handleClientPersonaChange(e.target.value)}
            data-testid="brief-persona-input"
          />
          <p className="text-xs text-muted-foreground">
            {t('brief.persona_hint') as any}
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">{t('brief.notes_label') as any}</Label>
          <Textarea
            id="notes"
            placeholder={t('brief.notes_placeholder') as any}
            value={brief?.notes ?? ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={3}
            data-testid="brief-notes-input"
          />
        </div>

        {/* Search Plans Button */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={async () => {
              // Initialize brief if it doesn't exist
              initializeBrief();

              // Check if category chooser is enabled
              const { sessionId, userId } = await getUserContext();
              const categoryChooserEnabled = getFFCategoryChooser({ sessionId, userId });

              // If no category selected and chooser is enabled, show it
              if (!category && categoryChooserEnabled) {
                setShowCategoryChooser(true);
                return;
              }
              
              // Apply brief if not already applied
              if (brief && !brief.isApplied) {
                updateBrief({ isApplied: true }, { field: 'isApplied' });
                applyBrief();
              }
              
              // Track telemetry
              try {
                const { fieldsFilled, totalFields, fieldNames } = telemetry.metrics.countBriefFields(brief || {});
                telemetry.track(telemetry.events.BRIEF_SUBMITTED, {
                  fieldsFilled,
                  totalFields,
                  fieldNames,
                  category: category || null,
                  hasBudget: typeof maxBudgetCop === 'number' && maxBudgetCop > 0,
                  mustHaveCount: Array.isArray(mustHaveCoverages) ? mustHaveCoverages.length : 0,
                  sessionId,
                  userId
                });
                telemetry.track(telemetry.events.BRIEF_SEARCH_CLICKED, {
                  sessionId,
                  userId,
                  category: category || null,
                  maxBudgetCop: maxBudgetCop || null,
                  mustHaveCount: mustHaveCoverages?.length || 0
                });
                telemetry.metrics.markTimeToProposalStart();
              } catch (e) {
                console.error('Telemetry error:', e);
              }
              
              // Dispatch event to trigger search
              window.dispatchEvent(new CustomEvent('briki:search-plans'));
            }}
            className="w-full"
            disabled={!category && !getFFCategoryChooser({ sessionId: brief?.sessionId || '', userId: brief?.userId || '' })}
            data-testid="brief-search-button"
          >
            {t('brief.search') as any}
          </Button>
          {!category && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('brief.select_category_to_search_hint') as any}
            </p>
          )}
        </div>

        {/* Category Chooser Modal */}
        <CategoryChooser
          open={showCategoryChooser}
          onClose={() => setShowCategoryChooser(false)}
          onSelect={async (selectedCategory) => {
            // Guard against unchanged selection
            if (selectedCategory === category) return;

            // Track disambiguation telemetry first
            try {
              const { sessionId, userId } = await getUserContext();
              telemetry.track(telemetry.events.CATEGORY_DISAMBIGUATED, {
                selectedCategory,
                source: 'search_click',
                sessionId,
                userId
              });
            } catch {}

            handleCategoryChange(CATEGORY_OPTIONS.find(opt => opt.label === selectedCategory)?.value || '');
            
            // After setting category, trigger search
            if (brief && !brief.isApplied) {
              updateBrief({ isApplied: true }, { field: 'isApplied' });
              applyBrief();
            }
            
            // Track telemetry
            try {
              const { sessionId, userId } = await getUserContext();
              const { fieldsFilled, totalFields, fieldNames } = telemetry.metrics.countBriefFields(brief || {});
              telemetry.track(telemetry.events.BRIEF_SUBMITTED, {
                fieldsFilled,
                totalFields,
                fieldNames,
                category: selectedCategory,
                hasBudget: typeof maxBudgetCop === 'number' && maxBudgetCop > 0,
                mustHaveCount: Array.isArray(mustHaveCoverages) ? mustHaveCoverages.length : 0,
                sessionId,
                userId
              });
              telemetry.track(telemetry.events.BRIEF_SEARCH_CLICKED, {
                sessionId,
                userId,
                category: selectedCategory,
                maxBudgetCop: maxBudgetCop || null,
                mustHaveCount: mustHaveCoverages?.length || 0
              });
              telemetry.metrics.markTimeToProposalStart();
            } catch (e) {
              console.error('Telemetry error:', e);
            }
            
            // Dispatch event to trigger search
            window.dispatchEvent(new CustomEvent('briki:search-plans'));
          }}
        />

        {/* Apply to Assistant Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="apply-toggle" className="text-sm font-medium">
              {t('brief.toggle.apply') as any}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('brief.toggle.applyDescription') as any}
            </p>
          </div>
          <Switch
            id="apply-toggle"
            checked={isApplied || false}
            onCheckedChange={handleApplyToggle}
            aria-label={t('brief.apply_to_assistant') as any}
          />
        </div>

        {/* Documents List */}
        {brief?.docRefs && brief.docRefs.length > 0 && (
          <div className="space-y-2">
            <Label>{t('brief.docs.attachedDocuments') as any}</Label>
            <div className="space-y-2">
              {brief.docRefs.map((docRef, index) => (
                <div
                  key={docRef.ref}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{docRef.title || (t('brief.docs.defaultTitle') as any)}</p>
                      <p className="text-xs text-muted-foreground">{docRef.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => previewDocument(docRef)}
                      className="h-8 w-8 p-0"
                      aria-label={`${t('brief.docs.preview') as any} ${docRef.title}`}
                      title={t('brief.docs.preview') as any}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(docRef.ref)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label={`${t('brief.docs.delete') as any} ${docRef.title}`}
                      title={t('brief.docs.delete') as any}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </CardContent>
      )}
      </div>
    </Card>
  );
}
