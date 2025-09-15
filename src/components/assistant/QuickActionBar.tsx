"use client";

import React, { useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useProposal, useUiPhase } from '@/state/proposal';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { FileText } from 'lucide-react';
import { CreateProposalButton } from '@/components/proposal/CreateProposalButton';
import { useAnalyzerUI } from '@/state/analyzerUI';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { useCompareStore } from '@/state/compareStore';
import { useCompareUI } from '@/state/compareUI';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrefsStore } from '@/state/prefsStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type DensityPreset = 'compact' | 'comfortable';

export function QuickActionBar({ density }: { density?: DensityPreset }) {
  const { t } = useTranslation();
  const selected = useProposal((s) => s.selected);
  const shortlist = useProposal((s) => s.shortlist);
  const uiPhase = useUiPhase();
  const openAnalyzer = useAnalyzerUI((s) => s.open);
  const compareCount = useCompareStore((s) => s.items.length);
  const openComparator = useCompareUI((s) => s.open);
  const lastOpenRef = useRef<number>(0);
  const prefDensity = usePrefsStore((s) => s.toolbarDensity);
  const setToolbarDensity = usePrefsStore((s) => s.setToolbarDensity);

  // Density preset: prop has priority; fallback to env; default comfortable (~44px)
  const envDensity = (process.env.NEXT_PUBLIC_TOOLBAR_DENSITY as DensityPreset | undefined);
  const resolvedDensity: DensityPreset = (density || prefDensity || envDensity || 'comfortable') as DensityPreset;
  const buttonSize: 'default' | 'sm' = resolvedDensity === 'compact' ? 'sm' : 'default';
  const buttonGapClass = resolvedDensity === 'compact' ? 'gap-1.5' : 'gap-2';
  const barGapClass = resolvedDensity === 'compact' ? 'gap-1.5' : 'gap-2';
  const sharedBtnClass = `inline-flex items-center ${buttonGapClass} px-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed`;

  const scrollToComparison = () => {
    try {
      const tryScroll = (attempts: number = 0) => {
        const el = document.getElementById('comparison-panel');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (attempts < 3) {
          // Try again shortly to allow React to render the comparator
          setTimeout(() => tryScroll(attempts + 1), 60);
        }
      };
      // First try, then schedule one more via rAF
      tryScroll(0);
      try { requestAnimationFrame(() => tryScroll(1)); } catch {}
    } catch {}
  };

  // Visibility rule: render in welcome & results, or when selections/shortlist exist
  const shouldShow = uiPhase === 'welcome' || uiPhase === 'results' || shortlist.length > 0 || selected.length > 0;

  if (!shouldShow) {
    return null;
  }

  const selectedCount = selected.length;
  const isProposalDisabled = selectedCount === 0;
  const isCompareDisabled = compareCount < 2;

  const handleCompare = () => {
    // Debounce telemetry to avoid duplicates across rapid clicks
    const now = Date.now();
    const since = now - (lastOpenRef.current || 0);
    lastOpenRef.current = now;

    // Open comparator (table is rendered when there are ≥2 items)
    try { openComparator(); } catch {}
    scrollToComparison();

    // Emit COMPARATOR_OPENED (single emission per click via debounce)
    if (since > 500) {
      getUserContext().then(({ sessionId, userId }) => {
        telemetry.track(telemetry.events.COMPARATOR_OPENED, {
          count: compareCount,
          pinnedIds: useCompareStore.getState().items.map(i => i.id),
          sessionId,
          userId,
        });
      }).catch(() => {});
    }
  };

  const handleAddToProposal = () => {
    window.dispatchEvent(new CustomEvent('briki:create-proposal'));
  };

  const handleOpenAnalyzer = () => {
    openAnalyzer('quickAction');
  };

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        className={`w-full flex flex-wrap items-center ${barGapClass} gap-y-2 px-3 py-2 border-b bg-white/70 dark:bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-10`}
        aria-label={t('assistant.quick_actions')}
        data-density={resolvedDensity}
      >
        {/* Analyze Policy (PDF) CTA */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={handleOpenAnalyzer}
              data-testid="open-analyzer-panel"
              className={sharedBtnClass}
              aria-label={t('assistant.analyze_policy')}
            >
              <FileText className="w-5 h-5" />
              <span className="hidden md:inline">{t('assistant.analyze_policy')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="md:hidden">{t('assistant.analyze_policy')}</TooltipContent>
        </Tooltip>

        {/* Compare Selected Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={handleCompare}
              disabled={isCompareDisabled}
              aria-disabled={isCompareDisabled}
              data-testid="compare-selected-btn"
              className={sharedBtnClass}
              aria-label={t('assistant.compare_selected')}
            >
              <ArrowLeftRight className="w-5 h-5" />
              <span className="hidden md:inline">{t('assistant.compare_selected')}</span>
              {compareCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {compareCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="md:hidden">{t('assistant.compare_selected')}</TooltipContent>
        </Tooltip>

        {/* Add to Proposal Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={handleAddToProposal}
              disabled={isProposalDisabled}
              aria-disabled={isProposalDisabled}
              className={sharedBtnClass}
              aria-label={t('assistant.add_to_proposal')}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden md:inline">{t('assistant.add_to_proposal')}</span>
              {selectedCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {selectedCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="md:hidden">{t('assistant.add_to_proposal')}</TooltipContent>
        </Tooltip>

        {/* Generate Proposal Button (Primary) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <CreateProposalButton
                variant="default"
                size={buttonSize}
                density={resolvedDensity}
                data-testid="create-proposal-button"
                className={`${sharedBtnClass} rounded-md border bg-blue-600 hover:bg-blue-700 text-white border-blue-600`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="md:hidden">{t('proposal.create')}</TooltipContent>
        </Tooltip>

        {/* Density selector */}
        <div className="ml-auto flex items-center">
          <Select
            value={resolvedDensity}
            onValueChange={async (value) => {
              try {
                const prev = prefDensity as any;
                setToolbarDensity(value as any);
                const { sessionId, userId } = await getUserContext();
                telemetry.track('TOOLBAR_DENSITY_CHANGED', {
                  from: prev,
                  to: value,
                  sessionId,
                  userId,
                });
              } catch {}
            }}
          >
            <SelectTrigger aria-label={t('toolbar.density.label')} className={resolvedDensity === 'compact' ? 'h-8 w-[9.5rem]' : 'h-9 w-[9.5rem]'} title={t('toolbar.density.label') as string}>
              <SelectValue placeholder={t('toolbar.density.label')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">{t('toolbar.density.compact') as any}</SelectItem>
              <SelectItem value="comfortable">{t('toolbar.density.comfortable') as any}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </TooltipProvider>
  );
}
