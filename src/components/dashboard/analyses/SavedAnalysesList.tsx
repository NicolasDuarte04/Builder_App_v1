"use client";

import React from 'react';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { eventBus, BrikiEvents } from '@/lib/event-bus';

interface SavedPolicyRow {
  id: string;
  custom_name: string;
  insurer_name?: string;
  policy_type?: string;
  created_at?: string;
  pdf_url?: string;
  metadata?: any;
  extracted_data?: any;
}

async function fetchSavedPolicies(opts: { search?: string; limit: number; offset: number }) {
  const url = new URL('/api/policies', window.location.origin);
  if (opts.search) url.searchParams.set('search', opts.search);
  url.searchParams.set('limit', String(opts.limit));
  url.searchParams.set('offset', String(opts.offset));
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load policies');
  return res.json() as Promise<{ policies: SavedPolicyRow[]; total: number; limit: number; offset: number }>;
}

async function deleteSavedPolicy(id: string) {
  const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete policy');
  return true;
}

export default function SavedAnalysesList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;
  const offset = page * limit;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SavedPolicyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [viewItem, setViewItem] = useState<SavedPolicyRow | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchSavedPolicies({ search: search.trim() || undefined, limit, offset });
      setItems(data.policies || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      toast({ title: t('common.error') || 'Error', description: e?.message || 'Failed to load', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const unsub = eventBus.on(BrikiEvents.POLICY_SAVED, () => {
      // reload first page on save
      setPage(0);
      void load();
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const canPrev = page > 0;
  const canNext = (page + 1) * limit < total;

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedPolicy(id);
      toast({ title: t('common.success') || 'Success', description: t('dashboard.insurance.deleted') || 'Deleted' });
      void load();
    } catch (e: any) {
      toast({ title: t('common.error') || 'Error', description: e?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input
          placeholder={t('dashboard.insurance.searchPlaceholder') || 'Search by name or insurer'}
          value={search}
          onChange={(e) => { setPage(0); setSearch(e.target.value); }}
          className="sm:max-w-md"
        />
        <div className="flex-1" />
        <Button variant="outline" onClick={() => { setPage(0); void load(); }}>{t('common.refresh') || 'Refresh'}</Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-28" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">{t('dashboard.insurance.savedAnalyses.emptyTitle') || "You haven't saved any analyses yet."}</p>
            <a href="/assistant" className="text-blue-600 hover:underline">{t('dashboard.insurance.savedAnalyses.analyzeButton') || 'Analyze a policy'}</a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.custom_name}</div>
                  <div className="text-xs text-gray-500 truncate">{p.insurer_name || '-'}</div>
                  <div className="text-[11px] text-gray-400">{p.policy_type || ''} {p.created_at ? '· ' + new Date(p.created_at).toLocaleString() : ''}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setViewItem(p)}>{t('common.view') || 'View'}</Button>
                  <Button size="sm" variant="outline" disabled title={t('common.comingSoon') || 'Coming soon'}>
                    {t('dashboard.insurance.compare') || 'Compare'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void handleDelete(p.id)}>
                    {t('common.delete') || 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between items-center">
            <Button variant="outline" disabled={!canPrev} onClick={() => canPrev && setPage((p) => p - 1)}>
              {t('common.prev') || 'Prev'}
            </Button>
            <div className="text-xs text-gray-500">
              {offset + 1}–{Math.min(offset + limit, total)} / {total}
            </div>
            <Button variant="outline" disabled={!canNext} onClick={() => canNext && setPage((p) => p + 1)}>
              {t('common.next') || 'Next'}
            </Button>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="font-semibold">{viewItem.custom_name}</div>
              <Button variant="outline" onClick={() => setViewItem(null)}>{t('common.close') || 'Close'}</Button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="text-sm"><strong>{t('dashboard.insurance.insurer') || 'Insurer'}:</strong> {viewItem.insurer_name || '-'}</div>
              <div className="text-sm"><strong>{t('dashboard.insurance.type') || 'Type'}:</strong> {viewItem.policy_type || '-'}</div>
              {viewItem.metadata && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">Metadata</summary>
                  <pre className="text-xs mt-2 whitespace-pre-wrap break-words">{JSON.stringify(viewItem.metadata, null, 2)}</pre>
                </details>
              )}
              {viewItem.extracted_data && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">Extracted</summary>
                  <pre className="text-xs mt-2 whitespace-pre-wrap break-words">{JSON.stringify(viewItem.extracted_data, null, 2)}</pre>
                </details>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              {viewItem.pdf_url && (
                <a href={viewItem.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                  {t('dashboard.insurance.openPdf') || 'Open original PDF'}
                </a>
              )}
              <Button variant="outline" onClick={() => setViewItem(null)}>{t('common.close') || 'Close'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
