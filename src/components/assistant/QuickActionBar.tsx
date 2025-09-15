"use client";

import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useProposal, useUiPhase } from '@/state/proposal';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { FileText } from 'lucide-react';
import { CreateProposalButton } from '@/components/proposal/CreateProposalButton';
import { useAnalyzerUI } from '@/state/analyzerUI';

export function QuickActionBar() {
  const { t } = useTranslation();
  const selected = useProposal((s) => s.selected);
  const shortlist = useProposal((s) => s.shortlist);
  const uiPhase = useUiPhase();
  const openAnalyzer = useAnalyzerUI((s) => s.open);

  // Visibility rule: render in welcome & results, or when selections/shortlist exist
  const shouldShow = uiPhase === 'welcome' || uiPhase === 'results' || shortlist.length > 0 || selected.length > 0;

  if (!shouldShow) {
    return null;
  }

  const selectedCount = selected.length;
  const isDisabled = selectedCount === 0;

  const handleCompare = () => {
    window.dispatchEvent(new CustomEvent('briki:compare-selected'));
  };

  const handleAddToProposal = () => {
    window.dispatchEvent(new CustomEvent('briki:create-proposal'));
  };

  const handleOpenAnalyzer = () => {
    openAnalyzer('quickAction');
  };

  return (
    <div
      role="toolbar"
      className="w-full flex items-center gap-2 px-3 py-2 border-b bg-white/70 dark:bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-10"
      aria-label={t('assistant.quick_actions')}
    >
      {/* Analyze Policy (PDF) CTA */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenAnalyzer}
        data-testid="open-analyzer-panel"
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
        aria-label={t('assistant.analyze_policy')}
      >
        <FileText className="w-4 h-4" />
        <span>{t('assistant.analyze_policy')}</span>
      </Button>

      {/* Compare Selected Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCompare}
        disabled={isDisabled}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label={t('assistant.compare_selected')}
      >
        <ArrowLeftRight className="w-4 h-4" />
        <span>{t('assistant.compare_selected')}</span>
        {selectedCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {selectedCount}
          </span>
        )}
      </Button>

      {/* Add to Proposal Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddToProposal}
        disabled={isDisabled}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label={t('assistant.add_to_proposal')}
      >
        <Plus className="w-4 h-4" />
        <span>{t('assistant.add_to_proposal')}</span>
        {selectedCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            {selectedCount}
          </span>
        )}
      </Button>

      {/* Generate Proposal Button (Primary) */}
      <CreateProposalButton
        variant="default"
        size="sm"
        data-testid="create-proposal-button"
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
      />
    </div>
  );
}
