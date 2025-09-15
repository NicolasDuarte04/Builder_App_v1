"use client";

import { useEffect } from 'react';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { useTranslation } from '@/hooks/useTranslation';

export function ResultsStatusBanner() {
  const { t } = useTranslation();

  // Track banner shown once per session
  useEffect(() => {
    (async () => {
      try {
        const { sessionId, userId } = await getUserContext();
        const key = `results-banner-shown:${sessionId}`;
        if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
          telemetry.track(telemetry.events.RESULTS_STATUS_BANNER_SHOWN, { sessionId, userId });
          sessionStorage.setItem(key, '1');
        }
      } catch {}
    })();
  }, []);

  const handleEditClick = async () => {
    try {
      const { sessionId, userId } = await getUserContext();
      telemetry.track(telemetry.events.RESULTS_STATUS_EDIT_CLICKED, { sessionId, userId });
    } catch {}
    try { 
      window.dispatchEvent(new CustomEvent('briki:open-brief')); 
    } catch {}
  };

  return (
    <div className="px-3 py-2 mb-2 mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between">
      <span>
        Opciones preparadas según tu brief. Fuentes: PDFs/URLs adjuntos.
      </span>
      <button
        type="button"
        onClick={handleEditClick}
        className="ml-3 text-xs font-medium text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-200"
      >
        Editar
      </button>
    </div>
  );
}
