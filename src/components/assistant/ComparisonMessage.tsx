"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Minus, Star, TrendingUp, Info } from 'lucide-react';
import { InsurancePlan } from '@/components/briki-ai-assistant/NewPlanCard';
import { Badge } from '@/components/ui/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { jsPDF } from 'jspdf';

interface ComparisonMessageProps {
  plans: InsurancePlan[];
}

export function ComparisonMessage({ plans }: ComparisonMessageProps) {
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
    return base.sort((a, b) => score(b) - score(a));
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

  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);

  const exportComparisonPDF = () => {
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(14);
    doc.text('Comparación de Planes', 14, y); y += 8;
    plans.forEach((p, idx) => {
      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${p.name} - ${p.provider}`, 14, y); y += 6;
      if (p.basePrice) {
        doc.text(`Precio: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: p.currency || 'COP', minimumFractionDigits: 0 }).format(p.basePrice)}/mes`, 18, y); y += 6;
      }
      doc.text(`Categoría: ${p.category || 'General'}`, 18, y); y += 6;
      const feats = (p.benefits || []).slice(0, 8).join(', ');
      if (feats) { doc.text(`Beneficios: ${feats}`, 18, y); y += 6; }
      y += 2;
      if (y > 270) { doc.addPage(); y = 15; }
    });
    doc.save('comparacion_planes.pdf');
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
          Comparación de Planes ({plans.length} planes)
        </h3>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Análisis detallado de los planes seleccionados</span>
          <Badge variant="neutral" className="text-[10px]" label="Recomendado para ti" />
          <button onClick={exportComparisonPDF} className="ml-auto text-xs text-blue-600 dark:text-blue-300 hover:underline">
            Exportar a PDF
          </button>
        </div>
        {/* Quick verdicts */}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-2 py-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <span>
              Plan más económico:
              <strong className="ml-1">{cheapestPlan?.name || 'N/A'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-2 py-1">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <span>
              Mejor calificación:
              <strong className="ml-1">{bestRated?.name || 'N/A'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-2 py-1">
            <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>
              Más beneficios:
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
              onChange={(e) => setShowOnlyDifferences(e.target.checked)}
            />
            Ver solo diferencias
          </label>
          <a
            className="text-blue-600 dark:text-blue-300 hover:underline"
            href={`mailto:?subject=Comparación de Planes&body=${encodeURIComponent(plans.map(p => `• ${p.name} - ${p.provider}${p.basePrice ? ` (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: p.currency || 'COP', minimumFractionDigits: 0 }).format(p.basePrice)}/mes)` : ''}`).join('\n'))}`}
          >
            Compartir por correo
          </a>
          <button
            className="text-blue-600 dark:text-blue-300 hover:underline"
            onClick={() => {
              try {
                localStorage.setItem('briki:last_comparison', JSON.stringify(plans));
              } catch {}
            }}
          >
            Guardar comparación
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 text-sm sticky left-0 z-20 bg-gray-50 dark:bg-gray-900">
                Característica
              </th>
              {plans.map((plan, index) => (
                <th key={plan.id} className="p-3 text-center">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {plan.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {plan.provider}
                    </p>
                    {plan.basePrice ? (
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {formatCurrency(plan.basePrice, plan.currency)} / mes
                      </p>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price */}
            <tr className={`border-b border-gray-100 dark:border-gray-800 ${getRowDiffClass(plans.map(p => p.basePrice))}`}>
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Precio Mensual</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`p-3 text-center align-middle ${cheapestPlan && plan.id === cheapestPlan.id ? 'font-semibold text-green-700' : ''}`}>
                  {plan.basePrice && plan.basePrice > 0 ? (
                    <div>
                      <p className="text-lg text-gray-900 dark:text-white">
                        {formatCurrency(plan.basePrice, plan.currency)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">/mes</p>
                      {cheapestPlan && plan.id === cheapestPlan.id && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded px-1.5 py-0.5 mt-1">Mejor precio</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Minus className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr className={`border-b border-gray-100 dark:border-gray-800 ${getRowDiffClass(plans.map(p => p.rating))}`}>
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Calificación</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`p-3 text-center align-middle ${bestRated && plan.id === bestRated.id ? 'font-semibold' : ''}`}>
                  {plan.rating ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-gray-900 dark:text-white">
                        {plan.rating.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Minus className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Category */}
            <tr className={`border-b border-gray-100 dark:border-gray-800 ${getRowDiffClass(plans.map(p => p.category))}`}>
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Categoría</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-center">
                  <Badge variant="neutral" className="text-xs" label={plan.category || 'General'} />
                </td>
              ))}
            </tr>

            {/* Additional dimensions (placeholders) */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Elegibilidad</td>
              {plans.map(p => (<td key={p.id} className="p-3 text-center align-middle text-xs text-gray-500">—</td>))}
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Periodo de carencia</td>
              {plans.map(p => (<td key={p.id} className="p-3 text-center align-middle text-xs text-gray-500">—</td>))}
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Duración de cobertura</td>
              {plans.map(p => (<td key={p.id} className="p-3 text-center align-middle text-xs text-gray-500">—</td>))}
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Velocidad de reclamo</td>
              {plans.map(p => (<td key={p.id} className="p-3 text-center align-middle text-xs text-gray-500">—</td>))}
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Soporte al cliente</td>
              {plans.map(p => (<td key={p.id} className="p-3 text-center align-middle text-xs text-gray-500">—</td>))}
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Add-ons opcionales</td>
              {plans.map(p => (<td key={p.id} className="p-3 text-center align-middle text-xs text-gray-500">—</td>))}
            </tr>

            {/* Features */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800" colSpan={plans.length + 1}>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Coberturas Incluidas
                </div>
              </td>
            </tr>
            {features.map((feature, index) => {
              const values = plans.map(p => (p.benefits || []).includes(feature));
              const rowClass = getRowDiffClass(values);
              if (showOnlyDifferences && !hasDifferences(values)) return null;
              const zebra = index % 2 === 1 ? 'bg-gray-50/40 dark:bg-neutral-900/5' : '';
              return (
              <tr key={index} className={`border-b border-gray-100 dark:border-gray-800 ${rowClass || zebra}`}>
                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 sticky left-0 z-10 bg-white dark:bg-gray-800">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">
                        {feature}
                        <Info className="h-3 w-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Explicación breve del beneficio.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                {plans.map((plan) => {
                  const hasFeature = plan.benefits?.includes(feature);
                  return (
                    <td key={plan.id} className="p-3 text-center align-middle">
                      {hasFeature ? (
                        <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="h-4 w-4" /> No incluido
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )})}

            {/* Benefits Count */}
            <tr className={`border-b border-gray-100 dark:border-gray-800 ${getRowDiffClass(plans.map(p => p.benefits?.length || 0))}`}>
              <td className="p-3 font-medium text-sm sticky left-0 z-10 bg-white dark:bg-gray-800">Beneficios Totales Incluidos</td>
              {plans.map((plan) => (
                <td key={plan.id} className={`p-3 text-center ${mostBenefits && plan.id === mostBenefits.id ? 'font-semibold text-blue-700' : ''}`}>
                  <Badge variant="neutral" label={`${plan.benefits?.length || 0}`} />
                </td>
              ))}
            </tr>

            {/* External Link */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-sm">Cotización</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-center">
                  {plan.external_link && plan.link_status !== 'broken' ? (
                    <a
                      href={plan.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Cotizar ahora
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">Solicitar cotización</span>
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
            Comparación generada automáticamente
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
