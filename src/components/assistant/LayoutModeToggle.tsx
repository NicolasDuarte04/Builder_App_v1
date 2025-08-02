"use client";

import React from 'react';
import { Layout, Sidebar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanResults } from '@/contexts/PlanResultsContext';
import { useTranslation } from '@/hooks/useTranslation';

interface LayoutModeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'floating' | 'inline';
}

export function LayoutModeToggle({ 
  className = "", 
  size = 'sm',
  variant = 'floating'
}: LayoutModeToggleProps) {
  const { t } = useTranslation();
  const { 
    currentResults, 
    isRightPanelOpen, 
    hideRightPanel, 
    isDualPanelMode, 
    setDualPanelMode 
  } = usePlanResults();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm', 
    lg: 'px-6 py-3 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const baseClasses = variant === 'floating' 
    ? 'fixed top-20 right-4 z-30 flex items-center gap-2'
    : 'flex items-center gap-2';

  return (
    <div className={`${baseClasses} ${className}`}>
      {/* Layout Mode Toggle */}
      <button
        onClick={() => setDualPanelMode(!isDualPanelMode)}
        className={`flex items-center gap-2 ${sizeClasses[size]} font-medium rounded-full transition-all ${
          isDualPanelMode
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
        }`}
        title={isDualPanelMode ? 'Switch to single panel view' : 'Switch to dual panel view'}
      >
        <Layout className={iconSizes[size]} />
        {size !== 'sm' && (
          <span>{isDualPanelMode ? 'Dual Panel' : 'Single Panel'}</span>
        )}
      </button>

      {/* Panel Close Button (only shown when panel is open) */}
      {isDualPanelMode && isRightPanelOpen && (
        <button
          onClick={hideRightPanel}
          className={`flex items-center gap-2 ${sizeClasses[size]} font-medium rounded-full transition-all bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-800/50`}
          title="Close results panel"
        >
          <Sidebar className={iconSizes[size]} />
          {size !== 'sm' && <span>Close Panel</span>}
        </button>
      )}

      {/* Status indicator */}
      {isDualPanelMode && currentResults && currentResults.plans.length > 0 && (
        <div className={`flex items-center gap-2 ${sizeClasses[size]} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-full`}>
          <span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1rem] h-4 flex items-center justify-center">
            {currentResults.plans.length}
          </span>
          {size !== 'sm' && <span>Plans Ready</span>}
        </div>
      )}

      {/* Legacy mode indicator */}
      {!isDualPanelMode && currentResults && currentResults.plans.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setDualPanelMode(true)}
            className={`flex items-center gap-2 ${sizeClasses[size]} font-medium rounded-full transition-all bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-800/50`}
            title="Switch to dual-panel for better comparison"
          >
            <MessageSquare className={iconSizes[size]} />
            {size !== 'sm' && <span>Try Dual Panel</span>}
            <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1rem] h-4 flex items-center justify-center animate-pulse">
              {currentResults.plans.length}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// Hook for programmatically controlling layout mode
export function useLayoutMode() {
  const { isDualPanelMode, setDualPanelMode, isRightPanelOpen, hideRightPanel } = usePlanResults();

  const enableDualPanelMode = () => {
    setDualPanelMode(true);
  };

  const disableDualPanelMode = () => {
    setDualPanelMode(false);
    hideRightPanel();
  };

  const closeRightPanel = () => {
    hideRightPanel();
  };

  return {
    isDualPanelMode,
    isRightPanelOpen,
    enableDualPanelMode,
    disableDualPanelMode,
    closeRightPanel,
    setDualPanelMode,
    hideRightPanel
  };
}