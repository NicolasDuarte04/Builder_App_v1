"use client";

import { useUIOverlay } from '@/state/uiOverlay';
import { usePlanResults } from '@/contexts/PlanResultsContext';

export function ResultsToggle() {
  const { resultsState, analyzeModalOpen, openResults } = useUIOverlay();
  const { setSidebarOpen } = usePlanResults();

  if (analyzeModalOpen || resultsState !== 'minimized') return null;

  const handleClick = () => {
    // Restore overlay state and reopen the right panel
    openResults();
    setSidebarOpen(true);
  };

  return (
    <button
      type="button"
      aria-label="Open results"
      onClick={handleClick}
      className="fixed bottom-4 right-4 z-[90] flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <span className="hidden sm:inline">Resultados</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l6.5 6.5a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 11-1.06-1.06L11.94 10 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
    </button>
  );
}


