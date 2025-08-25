"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPolicyById, updatePolicy, deletePolicy } from '@/lib/api/policies';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { PolicyAnalysisDisplay } from '@/components/assistant/PolicyAnalysisDisplay';

interface Props {
  id: string;
  defaultTitle: string;
  onClose: () => void;
  onDeleted: () => void;
  onRenamed: (name: string) => void;
}

export function PolicyViewDialog({ id, defaultTitle, onClose, onDeleted, onRenamed }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(defaultTitle);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPolicyById(id)
      .then((p) => { if (!alive) return; setData(p); setName(p.custom_name || defaultTitle); })
      .catch((e) => { if (!alive) return; setError(e.message || 'Failed to load'); })
      .finally(() => { if (!alive) return; setLoading(false); });
    return () => { alive = false; };
  }, [id, defaultTitle]);

  // Map saved_policies row to PolicyAnalysisDisplay props
  const display = useMemo(() => {
    if (!data) return null;
    const a = data.analysis || {};
    // Construct minimal shape PolicyAnalysisDisplay expects
    const analysis = {
      policyType: data.policy_type || '',
      premium: a.prima ? { amount: a.prima.amount || 0, currency: a.prima.currency || 'COP', frequency: a.prima.frequency || 'monthly' } : { amount: 0, currency: 'COP', frequency: 'monthly' },
      coverage: {
        limits: Object.fromEntries((a.limites_cobertura || []).map((it: any) => [it.label || '-', parseNumberLike(it.value)])),
        deductibles: Object.fromEntries((a.deducibles || []).map((it: any) => [it.label || '-', parseNumberLike(it.value)])),
        exclusions: a.exclusiones || [],
      },
      policyDetails: { policyNumber: data?.metadata?.policy_number || undefined, effectiveDate: data?.metadata?.effective_date || undefined, expirationDate: data?.metadata?.expiration_date || undefined, insured: [] },
      insurer: { name: data.insurer_name || undefined },
      keyFeatures: a.caracteristicas || [],
      recommendations: a.recomendaciones || [],
      riskScore: (a.evaluacion_riesgo?.score ?? data?.metadata?.risk_score) || 0,
      riskJustification: a.evaluacion_riesgo?.notes || undefined,
      redFlags: a.senales_alerta || [],
    };
    return { analysis, pdfUrl: data.pdf_url, fileName: data.custom_name, rawAnalysisData: data.extracted_data };
  }, [data]);

  const handleRename = async () => {
    try {
      const updated = await updatePolicy(id, { custom_name: name });
      setData(updated);
      onRenamed(name);
      setIsRenaming(false);
      toast({ title: t('common.success') || 'Success', description: t('common.saved') || 'Saved' });
    } catch (e: any) {
      toast({ title: t('common.error') || 'Error', description: e?.message || 'Failed to rename', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deletePolicy(id);
      toast({ title: t('common.success') || 'Success', description: t('dashboard.insurance.deleted') || 'Deleted' });
      onDeleted();
    } catch (e: any) {
      toast({ title: t('common.error') || 'Error', description: e?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center pt-[64px] p-0" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-screen max-w-screen-2xl h-[calc(100vh-64px)] rounded-none border-t border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 justify-between">
          {isRenaming ? (
            <div className="flex items-center gap-2 w-full">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
              <Button size="sm" onClick={handleRename}>{t('common.save') || 'Save'}</Button>
              <Button size="sm" variant="outline" onClick={() => setIsRenaming(false)}>{t('common.cancel') || 'Cancel'}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="font-semibold text-lg truncate max-w-[40vw]">{name}</div>
              <Button size="sm" variant="outline" onClick={() => setIsRenaming(true)}>{t('common.rename') || 'Rename'}</Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            {data?.pdf_url && (
              <a href={data.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                {t('policy.viewOriginalPdf') || 'View original PDF'}
              </a>
            )}
            <Button size="sm" variant="destructive" onClick={handleDelete}>{t('common.delete') || 'Delete'}</Button>
            <Button size="sm" variant="outline" onClick={onClose}>{t('common.close') || 'Close'}</Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0 h-[calc(100%_-_48px)]">
          <div className="col-span-12 lg:col-span-8 min-w-0 overflow-y-auto p-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-500">{t('common.loading') || 'Loading…'}</div>
            ) : error ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <div className="text-sm text-red-600">{error}</div>
                <Button variant="outline" onClick={() => { setError(null); setLoading(true); getPolicyById(id).then(s => { setData(s); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}>{t('common.retry') || 'Retry'}</Button>
              </div>
            ) : display ? (
              <PolicyAnalysisDisplay analysis={display.analysis as any} pdfUrl={display.pdfUrl} fileName={display.fileName} rawAnalysisData={display.rawAnalysisData} hideSave />
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-gray-500">{t('common.noData') || 'No data'}</div>
            )}
          </div>
          {/* Right panel is provided by PolicyAnalysisDisplay when not hidden; we do not duplicate a second PDF here. */}
        </div>
      </div>
    </div>
  );
}

function parseNumberLike(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}


