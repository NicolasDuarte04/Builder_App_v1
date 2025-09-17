"use client";

import { useEffect } from 'react';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { useTranslation } from '@/hooks/useTranslation';

type ResultsStatusBannerProps = {
  variant?: 'context' | 'nocatalog';
  requestId?: string | null;
  category?: string | null;
};

export function ResultsStatusBanner({ variant = 'context', requestId, category }: ResultsStatusBannerProps) {
  const { t } = useTranslation();

  // Track banner shown once per session
  useEffect(() => {
    (async () => {
      try {
        const { sessionId, userId } = await getUserContext();
        if (variant === 'nocatalog') {
          const key = `nocatalog-banner-viewed:${requestId || sessionId}`;
          if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
            telemetry.track(telemetry.events.NOCATALOG_BANNER_VIEW || 'nocatalog.banner.view', {
              sessionId,
              userId,
              requestId: requestId || undefined,
              category: category || undefined,
            });
            sessionStorage.setItem(key, '1');
          }
        } else {
          const key = `results-banner-shown:${sessionId}`;
          if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
            telemetry.track(telemetry.events.RESULTS_STATUS_BANNER_SHOWN, { sessionId, userId });
            sessionStorage.setItem(key, '1');
          }
        }
      } catch {}
    })();
  }, []);

  const handleEditClick = async () => {
    try {
      const { sessionId, userId } = await getUserContext();
      if (variant === 'nocatalog') {
        telemetry.track(telemetry.events.NOCATALOG_BANNER_CLICK || 'nocatalog.banner.click', {
          cta: 'edit_brief',
          sessionId,
          userId,
          requestId: requestId || undefined,
          category: category || undefined,
        });
      } else {
        telemetry.track(telemetry.events.RESULTS_STATUS_EDIT_CLICKED, { sessionId, userId });
      }
    } catch {}
    try { 
      window.dispatchEvent(new CustomEvent('briki:open-brief')); 
    } catch {}
  };

  const handleChooseCategory = async () => {
    try {
      const { sessionId, userId } = await getUserContext();
      telemetry.track(telemetry.events.NOCATALOG_BANNER_CLICK || 'nocatalog.banner.click', {
        cta: 'choose_category',
        sessionId,
        userId,
        requestId: requestId || undefined,
        category: category || undefined,
      });
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('briki:open-category-chooser'));
    } catch {}
  };

  return (
    <div
      className={`px-3 py-2 mb-2 mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between ${variant === 'nocatalog' ? 'gap-2' : ''}`}
      data-testid={variant === 'nocatalog' ? 'nocatalog-banner' : undefined}
    >
      {variant === 'nocatalog' ? (
        <>
          <span>
            No encontramos resultados del catálogo. Ajusta tu brief o busca otra categoría.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEditClick}
              className="ml-1 text-xs font-medium text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-200"
              data-testid="nocatalog-cta-edit"
            >
              Editar brief
            </button>
            <button
              type="button"
              onClick={handleChooseCategory}
              className="ml-1 text-xs font-medium text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-200"
              data-testid="nocatalog-cta-category"
            >
              Buscar otra categoría
            </button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
