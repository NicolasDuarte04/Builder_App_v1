"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Minus, Star, TrendingUp, Info, ChevronDown } from 'lucide-react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { jsPDF } from 'jspdf';
import { useTranslation } from '@/hooks/useTranslation';
import { translateIfEnglish, translateListIfEnglish, translateCategoryIfEnglish, formatPlanName } from '@/lib/text-translation';

// UI tokens (normalized naming)
const ICON_16 = "h-4 w-4";                      // exact 16px everywhere
const CELL_PX = "px-3 py-2";                    // compact rows with a bit more horizontal space
const LABEL_TEXT = "text-[13px]";
const META_TEXT  = "text-[11px] text-gray-600 dark:text-gray-400";

// Color + grid tokens
const OK   = "text-green-600";
const NO   = "text-red-500";
const MUTED= "text-gray-600 dark:text-gray-400";
const ZEBRA= "bg-gray-50/40 dark:bg-neutral-900/5";
// Keep diff subtle and neutral to avoid visual noise
const DIFF = "bg-gray-50/40 dark:bg-neutral-900/5";
const GRID_Y = "divide-y divide-gray-100 dark:divide-gray-800";
const GRID_X = "divide-x divide-gray-100 dark:divide-gray-800";

interface ComparisonMessageProps {
  plans: InsurancePlan[];
}

export function ComparisonMessage({ plans }: ComparisonMessageProps) {
  const { language } = useTranslation();
  if (plans.length < 2) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Necesitas al menos 2 planes para hacer una comparación.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = "COP") => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const compareFeatures = () => {
    const allFeatures = new Set<string>();
    plans.forEach(plan => {
      if (plan.benefits) {
        plan.benefits.forEach((benefit: string) => allFeatures.add(benefit));
      }
    });
    return Array.from(allFeatures);
  };

  // Dynamic ordering of features based on common user intents
  const features = useMemo(() => {
    const base = compareFeatures();
    const priorityKeywords = ['universidad', 'educación', 'matrícula', 'colegiatura', 'ahorro'];
    const score = (f: string) => priorityKeywords.reduce((acc, kw) => acc + (f.toLowerCase().includes(kw) ? 1 : 0), 0);
    // Avoid mutating the input array; work on a shallow copy for sort stability
    return [...base].sort((a, b) => score(b) - score(a));
  }, [plans]);

  const getRowDiffClass = (values: Array<string | number | boolean | undefined>) => {
    const normalized = values.map((v) => (v === undefined || v === null ? '—' : String(v)));
    const first = normalized[0];
    const allSame = normalized.every((v) => v === first);
    return allSame ? '' : 'bg-yellow-50/50 dark:bg-yellow-900/10';
  };

  const hasDifferences = (values: Array<string | number | boolean | undefined>) => getRowDiffClass(values) !== '';

  const cheapestPlan = useMemo(() => (
    [...plans].filter(p => p.basePrice).sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0))[0]
  ), [plans]);
  const bestRated = useMemo(() => (
    [...plans].filter(p => p.rating).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
  ), [plans]);
  const mostBenefits = useMemo(() => (
    [...plans].sort((a, b) => (b.benefits?.length || 0) - (a.benefits?.length || 0))[0]
  ), [plans]);

  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('briki:compare:show_only_diffs');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [hiddenCount, setHiddenCount] = useState<number>(0);
  const [showBenefits, setShowBenefits] = useState<boolean>(false);
  const isExportingRef = React.useRef(false);

  useEffect(() => {
    if (!showOnlyDifferences) { setHiddenCount(0); return; }
    const count = features.reduce((acc, feature) => {
      const values = plans.map(p => (p.benefits || []).includes(feature));
      const first = String(values[0]);
      const allSame = values.every(v => String(v) === first);
      return acc + (allSame ? 1 : 0);
    }, 0);
    setHiddenCount(count);
  }, [features, plans, showOnlyDifferences]);

  // Helper: determine if at least one plan has a real value for given keys
  const hasAnyValue = (...keys: string[]) => {
    return plans.some((p) => {
      for (const key of keys) {
        const v = (p as any)?.[key];
        if (v !== undefined && v !== null) {
          const s = String(v).trim();
          if (s !== '' && s !== '—') return true;
        }
      }
      return false;
    });
  };

  const exportComparisonPDF = () => {
    if (isExportingRef.current) return; // guard
    isExportingRef.current = true;
    try {
      const doc = new jsPDF();
      const margin = 14;
      let y = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(language === 'es' ? 'Comparación de Planes' : 'Plan Comparison', margin, y);
      y += 10;

      // Column widths (38% + equal remainder)
      const pageWidth = doc.internal.pageSize.getWidth();
      const firstCol = Math.floor((pageWidth - margin * 2) * 0.38);
      const planCol = Math.floor(((pageWidth - margin * 2) - firstCol) / plans.length);

      const drawRow = (cells: string[], boldIdx: number[] = []) => {
        doc.setFontSize(10);
        let rowHeight = 0;
        const linesPerCell = cells.map((c, i) => doc.splitTextToSize(c, i === 0 ? firstCol - 4 : planCol - 4));
        linesPerCell.forEach(ls => { rowHeight = Math.max(rowHeight, 10 + (ls.length - 1) * 10); });
        if (y + rowHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        let x = margin;
        cells.forEach((c, i) => {
          const width = i === 0 ? firstCol : planCol;
          const lines = doc.splitTextToSize(c, width - 4);
          doc.setFont('helvetica', boldIdx.includes(i) ? 'bold' : 'normal');
          lines.forEach((ln: string, li: number) => doc.text(ln, x + 2, y + 8 + li * 10));
          x += width;
        });
        // horizontal rule
        doc.setDrawColor(230);
        doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
        y += rowHeight;
      };

      // Header row
      drawRow([
        language === 'es' ? 'Característica' : 'Feature',
        ...plans.map(p => `${formatPlanName(translateIfEnglish(p.name, language), language)}\n${p.provider || ''}`)
      ], [1,2,3,4,5,6,7,8].slice(0, plans.length).map(i => i));

      // Core rows
      const priceRow = [
        language === 'es' ? 'Precio Mensual' : 'Monthly Price',
        ...plans.map(p => p.basePrice && p.basePrice > 0 ? `${new Intl.NumberFormat('es-CO', { style: 'currency', currency: p.currency || 'COP', minimumFractionDigits: 0 }).format(p.basePrice)} / ${language === 'es' ? 'mes' : 'month'}` : '—')
      ];
      drawRow(priceRow);

      const ratingRow = [
        language === 'es' ? 'Calificación' : 'Rating',
        ...plans.map(p => (p.rating ? p.rating.toFixed(1) : '—'))
      ];
      drawRow(ratingRow);

      const categoryRow = [
        language === 'es' ? 'Categoría' : 'Category',
        ...plans.map(p => translateCategoryIfEnglish(p.category || 'General', language))
      ];
      drawRow(categoryRow);

      // Benefits (respect toggles)
      if (showBenefits) {
        drawRow([language === 'es' ? 'Coberturas Incluidas' : 'Included Coverages', ...plans.map(() => '')]);
        features.forEach((feature) => {
          const values = plans.map(p => (p.benefits || []).includes(feature));
          if (showOnlyDifferences && values.every(v => v === values[0])) return;
          drawRow([
            translateIfEnglish(feature, language),
            ...values.map(v => v ? (language === 'es' ? 'Incluido' : 'Included') : (language === 'es' ? 'No incluido' : 'Not included'))
          ]);
        });
      }

      doc.save(language === 'es' ? 'comparacion_planes.pdf' : 'plan_comparison.pdf');
    } finally {
      isExportingRef.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {language === 'es' ? `Comparación de Planes (${plans.length} planes)` : `Plan Comparison (${plans.length} plans)`}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">{language === 'es' ? 'Análisis detallado de los planes seleccionados' : 'Detailed analysis of selected plans'}</span>
          <Badge variant="secondary" className="text-[10px]">{language === 'es' ? 'Recomendado para ti' : 'Recommended for you'}</Badge>
          <button onClick={exportComparisonPDF} className="ml-auto text-xs text-blue-600 dark:text-blue-300 hover:underline">
            {language === 'es' ? 'Exportar a PDF' : 'Export to PDF'}
          </button>
        </div>
        {/* Quick verdicts */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-2 py-1">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span>
              {language === 'es' ? 'Plan más económico:' : 'Cheapest plan:'}
              <strong className="ml-1">{cheapestPlan?.name || 'N/A'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-2 py-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>
              {language === 'es' ? 'Mejor calificación:' : 'Best rating:'}
              <strong className="ml-1">{bestRated?.name || 'N/A'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-2 py-1">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span>
              {language === 'es' ? 'Más beneficios:' : 'Most benefits:'}
              <strong className="ml-1">{mostBenefits?.name || 'N/A'}</strong>
            </span>
          </div>
        </div>
        {/* Controls */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={showOnlyDifferences}
              onChange={(e) => {
                const val = e.target.checked;
                setShowOnlyDifferences(val);
                try { localStorage.setItem('briki:compare:show_only_diffs', JSON.stringify(val)); } catch {}
                // update hidden count based on current features
                const count = features.reduce((acc, feature) => {
                  const values = plans.map(p => (p.benefits || []).includes(feature));
                  const first = String(values[0]);
                  const allSame = values.every(v => String(v) === first);
                  return acc + (allSame ? 1 : 0);
                }, 0);
                setHiddenCount(count);
              }}
            />
             {language === 'es' ? 'Ver solo diferencias' : 'Show only differences'}
          </label>
          {showOnlyDifferences && hiddenCount > 0 && (
            <span className="inline-flex items-center gap-2 text-[11px] text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {language === 'es' ? `${hiddenCount} filas ocultas` : `${hiddenCount} rows hidden`}
              <button className="text-blue-600 hover:underline" onClick={() => setShowOnlyDifferences(false)}>
                {language === 'es' ? 'Mostrar todo' : 'Show all'}
              </button>
            </span>
          )}
          <a
            className="text-blue-600 dark:text-blue-300 hover:underline"
            href={`mailto:?subject=${encodeURIComponent(language === 'es' ? 'Comparación de Planes' : 'Plan Comparison')}&body=${encodeURIComponent(plans.map(p => `• ${translateIfEnglish(p.name, language)} - ${p.provider}${p.basePrice ? ` (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: p.currency || 'COP', minimumFractionDigits: 0 }).format(p.basePrice)}/${language === 'es' ? 'mes' : 'month'}` : ''}`).join('\n'))}`}
          >
            {language === 'es' ? 'Compartir por correo' : 'Share by email'}
          </a>
          <button
            className="text-blue-600 dark:text-blue-300 hover:underline"
            onClick={() => {
              try {
                localStorage.setItem('briki:last_comparison', JSON.stringify(plans));
              } catch {}
            }}
          >
            {language === 'es' ? 'Guardar comparación' : 'Save comparison'}
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className={`w-full table-fixed ${GRID_Y} ${GRID_X}`}>
          <colgroup>
            <col className="w-[38%]" />
            {plans.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <th className={`text-left ${CELL_PX} font-medium text-gray-700 dark:text-gray-300 text-sm sticky left-0 z-20 bg-gray-50 dark:bg-gray-900`}>
                {language === 'es' ? 'Característica' : 'Feature'}
              </th>
              {plans.map((plan, index) => (
                <th key={plan.id} className={`${CELL_PX} text-left align-top`}>
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2" title={formatPlanName(translateIfEnglish(plan.name, language), language)}>
                       {formatPlanName(translateIfEnglish(plan.name, language), language)}
                    </h4>
                    <p className={META_TEXT}>
                       {plan.provider}
                    </p>
                    {plan.basePrice ? (
                      <p className={META_TEXT}>
                         {formatCurrency(plan.basePrice, plan.currency)} / {language === 'es' ? 'mes' : 'month'}
                      </p>
                    ) : (
                      <p className={META_TEXT}>—</p>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price */}
            <tr className={`border-b border-gray-100 dark:border-gray-800`}>
             <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Precio Mensual' : 'Monthly Price'}</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`${CELL_PX} align-middle text-left ${cheapestPlan && plan.id === cheapestPlan.id ? 'font-semibold text-green-700' : ''}`}>
                  {plan.basePrice && plan.basePrice > 0 ? (
                    <div>
                      <p className="text-[13px] text-gray-900 dark:text-white">
                        {formatCurrency(plan.basePrice, plan.currency)}
                      </p>
                      <p className={META_TEXT}>/mes</p>
                      {cheapestPlan && plan.id === cheapestPlan.id && (
                         <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded px-1.5 py-0.5 mt-1">{language === 'es' ? 'Mejor precio' : 'Best price'}</span>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center">
                      <Minus className={`${ICON_16} ${MUTED}`} />
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr className={`border-b border-gray-100 dark:border-gray-800`}>
             <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Calificación' : 'Rating'}</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`${CELL_PX} align-middle text-left ${bestRated && plan.id === bestRated.id ? 'font-semibold' : ''}`}>
                  {plan.rating ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1">
                          <Star className={`${ICON_16} text-yellow-500`} />
                          <span className="text-gray-900 dark:text-white font-medium">
                            {plan.rating.toFixed(1)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {`${plan.rating.toFixed(1)}/5 ${language === 'es' ? 'basado en reseñas' : 'based on reviews'}`}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="inline-flex items-center">
                      <Minus className={`${ICON_16} ${MUTED}`} />
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Category */}
            <tr className={`border-b border-gray-100 dark:border-gray-800`}>
             <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Categoría' : 'Category'}</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`${CELL_PX} text-left align-middle`}>
                   <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{translateCategoryIfEnglish(plan.category || 'General', language)}</Badge>
                </td>
              ))}
            </tr>

            {/* Total Benefits Included (moved above Included Coverages) */}
             <tr className={`border-b border-gray-100 dark:border-gray-800`}>
               <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Beneficios Totales Incluidos' : 'Total Benefits Included'}</td>
               {plans.map((plan) => (
                 <td key={plan.id} className={`${CELL_PX} text-left`}>
                   <Badge variant="secondary" className="text-[11px] px-2 py-0.5">{`${plan.benefits?.length || 0}`}</Badge>
                 </td>
               ))}
             </tr>

            {/* Additional dimensions (conditionally rendered) */}
            {hasAnyValue('eligibility') && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Elegibilidad' : 'Eligibility'}</td>
                {plans.map(p => (<td key={p.id} className={`${CELL_PX} text-left align-middle ${META_TEXT}`}>{(p as any).eligibility ?? '—'}</td>))}
              </tr>
            )}
            {hasAnyValue('waitingPeriod') && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Periodo de carencia' : 'Waiting period'}</td>
                {plans.map(p => (<td key={p.id} className={`${CELL_PX} text-left align-middle ${META_TEXT}`}>{(p as any).waitingPeriod ?? '—'}</td>))}
              </tr>
            )}
            {hasAnyValue('coverageDuration') && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Duración de cobertura' : 'Coverage duration'}</td>
                {plans.map(p => (<td key={p.id} className={`${CELL_PX} text-left align-middle ${META_TEXT}`}>{(p as any).coverageDuration ?? '—'}</td>))}
              </tr>
            )}
            {hasAnyValue('claimSpeed') && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Velocidad de reclamo' : 'Claim speed'}</td>
                {plans.map(p => (<td key={p.id} className={`${CELL_PX} text-left align-middle ${META_TEXT}`}>{(p as any).claimSpeed ?? '—'}</td>))}
              </tr>
            )}
            {hasAnyValue('customerSupport') && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Soporte al cliente' : 'Customer support'}</td>
                {plans.map(p => (<td key={p.id} className={`${CELL_PX} text-left align-middle ${META_TEXT}`}>{(p as any).customerSupport ?? '—'}</td>))}
              </tr>
            )}
            {hasAnyValue('optionalAddOns') && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900`}>{language === 'es' ? 'Add-ons opcionales' : 'Optional add-ons'}</td>
                {plans.map(p => (<td key={p.id} className={`${CELL_PX} text-left align-middle ${META_TEXT}`}>{(p as any).optionalAddOns ?? '—'}</td>))}
              </tr>
            )}

            {/* Features */}
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <td className={`${CELL_PX} ${LABEL_TEXT} sticky left-0 z-10 bg-gray-100 dark:bg-gray-900`} colSpan={plans.length + 1}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{language === 'es' ? 'Coberturas Incluidas' : 'Included Coverages'}</span>
                  <button
                    className={`inline-flex items-center gap-1 ${META_TEXT} hover:text-blue-600 transition-transform`}
                    onClick={() => setShowBenefits((v) => !v)}
                    aria-expanded={showBenefits}
                  >
                    {showBenefits ? (language === 'es' ? 'Ocultar' : 'Hide') : (language === 'es' ? 'Mostrar coberturas' : 'Show coverages')}
                    <ChevronDown className={`${ICON_16} transform ${showBenefits ? 'rotate-180' : 'rotate-0'}`} />
                  </button>
                </div>
              </td>
            </tr>
            <AnimatePresence initial={false}>
              {showBenefits && features.map((feature, index) => {
                const values = plans.map(p => (p.benefits || []).includes(feature));
                const diff = !values.every(v => v === values[0]);
                if (showOnlyDifferences && !hasDifferences(values)) return null;
                const zebra = index % 2 === 1 ? ZEBRA : '';
                return (
                  <motion.tr
                    key={`benefit-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`border-b border-gray-100 dark:border-gray-800 ${diff ? DIFF : zebra}`}
                  >
                    <td className={`${CELL_PX} ${LABEL_TEXT} text-gray-700 dark:text-gray-300 sticky left-0 z-10 bg-inherit`}>
                      <span className="inline-flex items-center gap-1 align-middle">
                        <span className="align-middle">{translateIfEnglish(feature, language)}</span>
                      </span>
                    </td>
                    {plans.map((plan) => {
                      const hasFeature = plan.benefits?.includes(feature);
                      return (
                        <td key={plan.id} className={`${CELL_PX} text-left align-middle`}>
                          {hasFeature ? (
                            <span className={`inline-flex items-center gap-1 align-middle ${OK}`}>
                              <CheckCircle className={`${ICON_16}`} />
                            </span>
                          ) : (
                            <XCircle className={`${ICON_16} ${NO}`} />
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {/* Benefits Count (moved above) - removed duplicate below */}

            {/* External Link */}
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className={`${CELL_PX} ${LABEL_TEXT}`}>{language === 'es' ? 'Cotización' : 'Quote'}</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`${CELL_PX} text-left`}>
                  {((plan as any).external_link || (plan as any).website) ? (
                    <a
                      href={(plan as any).external_link || (plan as any).website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 align-middle text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300`}
                    >
                       {language === 'es' ? 'Cotizar ahora' : 'Quote now'}
                    </a>
                  ) : (
                     <span className={`text-[11px] text-gray-500`}>{language === 'es' ? 'No disponible' : 'Not available'}</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Brochure */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className={`${CELL_PX} ${LABEL_TEXT}`}>{language === 'es' ? 'Folleto' : 'Brochure'}</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`${CELL_PX} text-left`}>
                  {((plan as any).brochure_link || (plan as any).brochure) ? (
                    <a
                      href={(plan as any).brochure_link || (plan as any).brochure}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 align-middle text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300`}
                    >
                      {language === 'es' ? 'Ver folleto' : 'View brochure'}
                    </a>
                  ) : (
                    <span className={`text-[11px] text-gray-500`}>—</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
           <span className="text-gray-600 dark:text-gray-400">
             {language === 'es' ? 'Comparación generada automáticamente' : 'Comparison generated automatically'}
           </span>
          <span className="text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
