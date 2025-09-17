"use client";

import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCompareStore } from '@/state/compareStore';
import { fromSearchResultPlan } from '@/lib/comparison/adapters';

interface ComparisonMessageProps {
  plans: Array<{
    id?: string | number;
    name: string;
    provider?: string;
    price?: string | number | null;
    basePrice?: number | null;
    benefits?: string[];
    link?: string;
    rating?: number;
  }>;
}

function parsePrice(raw: any): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function ComparisonMessage({ plans }: ComparisonMessageProps) {
  const { t } = useTranslation();
  const add = useCompareStore(s => s.add);
  const isFull = useCompareStore(s => s.isFull);

  if (!Array.isArray(plans) || plans.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/50 text-sm">
        {t('comparator.noPlans') || 'No hay planes para comparar.'}
      </div>
    );
  }

  const handleAdd = (plan: any) => {
    try {
      const normalized = fromSearchResultPlan({
        id: plan.id ?? plan.name,
        name: plan.name,
        provider: plan.provider || '',
        basePrice: typeof plan.basePrice === 'number'
          ? plan.basePrice
          : (typeof plan.price === 'number' ? plan.price : parsePrice(plan.price)),
        benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
      });
      add(normalized);
    } catch (e) {
      try { console.warn('[ComparisonMessage] add failed', e); } catch {}
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-muted-foreground">
        {t('comparator.suggestedHeader') || 'Opciones sugeridas para comparar'}
      </div>
      <div className="space-y-2">
        {plans.slice(0, 5).map((p, idx) => (
          <div key={`${p.id ?? p.name}-${idx}`} className="p-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {p.name}
                </div>
                {(p.provider || p.price) && (
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    {p.provider && <span>{p.provider}</span>}
                    {p.provider && p.price ? ' · ' : ''}
                    {p.price && (
                      <span>
                        {typeof p.price === 'number' ? `COP ${p.price.toLocaleString('es-CO')}` : String(p.price)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    {t('open') || 'Abrir'}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleAdd(p)}
                  disabled={isFull}
                  className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('compare.add') || 'Comparar'}
                </button>
              </div>
            </div>
            {Array.isArray(p.benefits) && p.benefits.length > 0 && (
              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                {p.benefits.slice(0, 3).map((b: string, i: number) => (
                  <li key={i} className="truncate">• {b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ComparisonMessage;
