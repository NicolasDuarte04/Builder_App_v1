"use client";

import React from 'react';
// motion removed to unblock build
import { Shield, DollarSign, AlertTriangle, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { SavePolicyButton } from '../dashboard/SavePolicyButton';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/navigation';

interface PolicyAnalysis {
  policyType: string;
  premium: {
    amount: number;
    currency: string;
    frequency: string;
  };
  coverage: {
    limits: Record<string, number>;
    deductibles: Record<string, number>;
    exclusions: string[];
    geography?: string;
    claimInstructions?: string[];
  };
  policyDetails: {
    policyNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    insured: string[];
  };
  insurer?: {
    name?: string;
    contact?: string;
    emergencyLines?: string[];
  };
  premiumTable?: { label?: string; year?: string | number; plan?: string; amount?: number | string }[];
  keyFeatures: string[];
  recommendations: string[];
  riskScore: number;
  riskJustification?: string;
  sourceQuotes?: Record<string, string>;
  redFlags?: string[];
  missingInfo?: string[];
}

interface PolicyAnalysisDisplayProps {
  analysis: PolicyAnalysis;
  pdfUrl?: string;
  fileName?: string;
  rawAnalysisData?: any;
  uploaderUserId?: string;
}

export function PolicyAnalysisDisplay({ analysis, pdfUrl, fileName, rawAnalysisData, uploaderUserId }: PolicyAnalysisDisplayProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUserId = (session?.user as any)?.id;
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (score <= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  const meta = (analysis as any)?._pdfData || {};
  const safePdfUrl = typeof meta.pdfUrl === 'string' && /^https?:\/\//i.test(meta.pdfUrl) ? meta.pdfUrl : undefined;
  const shouldSendBase64 = !meta.uploadId && !safePdfUrl && typeof pdfUrl === 'string' && /^data:application\/pdf;base64,/i.test(pdfUrl);

  return (
    <div
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Análisis de Póliza
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {analysis.policyType} • {analysis.policyDetails.policyNumber}
        </p>
      </div>

      {/* Premium Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Prima</h4>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(analysis.premium.amount, analysis.premium.currency)}
          <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-1">
            /{analysis.premium.frequency}
          </span>
        </div>
        {/* Optional: Show how we calculated */}
        {Array.isArray(analysis.premiumTable) && analysis.premiumTable.length > 0 && (
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            <details>
              <summary className="cursor-pointer">Cómo lo calculamos</summary>
              <div className="mt-2">
                <p className="mb-2">Valores detectados en tablas:</p>
                <ul className="list-disc ml-5">
                  {analysis.premiumTable.slice(0, 6).map((row, idx) => (
                    <li key={idx}>{[row.year, row.plan, row.label].filter(Boolean).join(' • ')}: {typeof row.amount === 'number' ? formatCurrency(row.amount, analysis.premium.currency) : row.amount}</li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
        )}
        {/* View original PDF button if available */}
        {(pdfUrl as string) && (
          <div className="mt-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Ver PDF original
            </a>
          </div>
        )}
      </div>

      {/* Coverage Limits */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Límites de Cobertura</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.limits).map(([key, value]) => (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{key}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Deductibles */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Deductibles</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.coverage.deductibles).map(([key, value]) => (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{key}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(value, analysis.premium.currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Features */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Características Principales</h4>
        </div>
        <div className="space-y-2">
          {analysis.keyFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Exclusions */}
      {analysis.coverage.exclusions.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Exclusiones</h4>
          </div>
          <div className="space-y-2">
            {analysis.coverage.exclusions.map((exclusion, index) => (
              <div key={index} className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{exclusion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Evaluación de Riesgo</h4>
          </div>
          <Badge 
            label={`${analysis.riskScore}/10`} 
            variant="neutral" 
            className={getRiskColor(analysis.riskScore)}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {analysis.riskScore <= 3 ? 'Riesgo bajo' : 
           analysis.riskScore <= 6 ? 'Riesgo moderado' : 'Riesgo alto'}
        </p>
        {analysis.riskJustification && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {analysis.riskJustification}
          </p>
        )}
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Recomendaciones</h4>
          </div>
          <div className="space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Detalles de la Póliza</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {analysis.policyDetails.effectiveDate && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Fecha de inicio</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.policyDetails.effectiveDate}</p>
            </div>
          )}
          {analysis.policyDetails.expirationDate && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Fecha de vencimiento</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.policyDetails.expirationDate}</p>
            </div>
          )}
          {analysis.policyDetails.insured.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Asegurados</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {analysis.policyDetails.insured.join(', ')}
              </p>
            </div>
          )}
          {analysis.insurer?.contact && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Contacto de la aseguradora</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.insurer.contact}</p>
            </div>
          )}
          {analysis.insurer?.emergencyLines && analysis.insurer.emergencyLines.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Líneas de emergencia</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.insurer.emergencyLines.join(', ')}</p>
            </div>
          )}
          {analysis.coverage?.geography && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Cobertura geográfica</p>
              <p className="font-medium text-gray-900 dark:text-white">{analysis.coverage.geography}</p>
            </div>
          )}
          {analysis.coverage?.claimInstructions && analysis.coverage.claimInstructions.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Instrucciones de reclamo</p>
              <ul className="list-disc ml-5 text-gray-900 dark:text-white">
                {analysis.coverage.claimInstructions.map((step, idx) => (
                  <li key={idx} className="mb-1">{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Traceability: Source quotes, red flags, missing info */}
      {(analysis.sourceQuotes && Object.keys(analysis.sourceQuotes).length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <details>
            <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">Citas de origen (sourceQuotes)</summary>
            <div className="mt-3 space-y-2">
              {Object.entries(analysis.sourceQuotes).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <p className="text-gray-600 dark:text-gray-400">{k}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{v}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {(analysis.redFlags && analysis.redFlags.length > 0) && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Señales de alerta</h4>
          <ul className="list-disc ml-5 text-sm text-red-900 dark:text-red-100">
            {analysis.redFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {(analysis.missingInfo && analysis.missingInfo.length > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Información faltante</h4>
          <ul className="list-disc ml-5 text-sm text-yellow-900 dark:text-yellow-100">
            {analysis.missingInfo.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save Policy Section */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            ¿Te gustaría guardar este análisis en tu Bóveda de Seguros?
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
            Guarda este análisis para acceder fácilmente a los detalles de tu póliza en cualquier momento.
          </p>
          {meta.uploaderUserId && sessionUserId && meta.uploaderUserId !== sessionUserId && (
            <p className="text-xs text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300 px-3 py-2 rounded mb-3">
              Este análisis fue generado con otra cuenta.
            </p>
          )}
          <SavePolicyButton
            policyData={{
              custom_name: fileName || `${analysis.policyType} - ${new Date().toLocaleDateString()}`,
              insurer_name: analysis.insurer?.name || 'Sin Aseguradora',
              policy_type: analysis.policyType || 'General',
              priority: analysis.riskScore <= 3 ? 'low' : analysis.riskScore <= 6 ? 'medium' : 'high',
              pdf_base64: shouldSendBase64 ? pdfUrl : undefined,
              pdf_url: safePdfUrl,
              upload_id: meta.uploadId,
              storage_path: meta.storagePath,
              uploader_user_id: meta.uploaderUserId,
              metadata: {
                policy_number: analysis.policyDetails.policyNumber,
                effective_date: analysis.policyDetails.effectiveDate,
                expiration_date: analysis.policyDetails.expirationDate,
                premium_amount: analysis.premium.amount,
                premium_currency: analysis.premium.currency,
                premium_frequency: analysis.premium.frequency,
                risk_score: analysis.riskScore,
              },
              extracted_data: rawAnalysisData || analysis,
            }}
            onSuccess={() => {
              router.push('/dashboard/insurance');
            }}
          />
        </div>
      </div>
    </div>
  );
} 