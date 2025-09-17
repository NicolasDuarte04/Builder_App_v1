'use client';

import { useMemo, useState } from 'react';
import { FileText, Loader2, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { telemetry, getUserContext, normalizeError } from '@/lib/telemetry';
import { useCompareStore } from '@/state/compareStore';
import { useBriefStore } from '@/state/briefStore';
import { useProposal } from '@/state/proposal';
import { useTranslation } from '@/hooks/useTranslation';
import { ComparedPlan, SourceKind } from '@/types/compare';

type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';
type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
type DensityPreset = 'compact' | 'comfortable';

interface CreateProposalButtonProps {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  density?: DensityPreset;
}

// Minimal helper to map shortlist plan to ComparedPlan format
function mapShortlistPlanToCompared(plan: any): ComparedPlan {
  // Extract coverages as string array
  const coverages = plan.plan_benefits?.map((b: any) => 
    typeof b === 'string' ? b : (b.benefit_name || b.name || '')
  ).filter(Boolean) || [];

  return {
    id: plan.id,
    source: {
      kind: 'catalog' as SourceKind,
      ref: plan.id,
      updatedAt: plan.last_verified_at || plan.updatedAt || new Date().toISOString(),
    },
    name: plan.name_es || plan.name || 'Sin nombre',
    provider: plan.insurers?.name || 'Aseguradora desconocida',
    coverages,
    // Optional fields
    priceCop: plan.plan_pricing?.[0]?.price_cop || null,
    updatedAt: plan.last_verified_at || plan.updatedAt || new Date().toISOString(),
  };
}

export function CreateProposalButton({
  className = '',
  size = 'default',
  variant = 'default',
  disabled: disabledProp = false,
  density,
}: CreateProposalButtonProps) {
  const { t, language } = useTranslation();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [startTs, setStartTs] = useState<number | null>(null);

  const isDisabled = useMemo(() => disabledProp || isGenerating, [disabledProp, isGenerating]);

  // Feature flag: templates fallback (client-side)
  const isTemplatesFallbackEnabled = useMemo(() => {
    const raw = (process.env.NEXT_PUBLIC_ENABLE_TEMPLATES_FALLBACK ?? process.env.ENABLE_TEMPLATES_FALLBACK) as any;
    if (raw === undefined) return true; // default ON unless explicitly disabled
    const normalized = String(raw).toLowerCase();
    return !["0", "false", "off", "no"].includes(normalized);
  }, []);


  const detectUrlKind = (url?: string | null) => {
    if (!url) return 'unknown';
    try {
      if (url.startsWith('data:')) return 'data';
      if (url.startsWith('blob:')) return 'blob';
      const u = new URL(url);
      const protocol = (u.protocol || '').replace(':', '');
      if (protocol === 'http' || protocol === 'https') return protocol;
      return protocol || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const normalizeUrlKind = (fromApi?: string | null, url?: string | null): 'signed' | 'public' | 'none' | 'unknown' => {
    if (fromApi === 'signed' || fromApi === 'public' || fromApi === 'none') return fromApi;
    const raw = detectUrlKind(url);
    if (raw === 'http' || raw === 'https') return 'public';
    if (raw === 'blob' || raw === 'data') return 'none';
    return 'none';
  };

  const handleGenerate = async () => {
    if (isDisabled) return;
    
    // Read candidates, prefer pinned (compare) over shortlist
    const pinnedRaw = useCompareStore.getState().items;
    const pinned = isTemplatesFallbackEnabled
      ? pinnedRaw
      : pinnedRaw.filter(p => p?.source?.kind === 'catalog');
    const shortlist = useProposal.getState().shortlist;

    const items: ComparedPlan[] =
      (pinned?.length ?? 0) > 0
        ? pinned
        : (shortlist ?? []).map(mapShortlistPlanToCompared);
    
    // Check if we have any items
    if (items.length === 0) {
      toast({
        title: t('proposal.noItems') || 'Selecciona o fija al menos un plan',
        description: t('proposal.selectPlansFirst') || 'Necesitas seleccionar al menos un plan para generar una propuesta',
        variant: 'destructive',
      });
      return;
    }
    
    // Dev-only log
    if (process.env.NODE_ENV === 'development') {
      console.log('[CreateProposalButton] candidates', { 
        shortlist: shortlist.length, 
        pinned: pinned.length, 
        items: items.length 
      });
    }
    
    setIsGenerating(true);
    setResultUrl(null);
    setResultId(null);
    setStartTs(Date.now());
    try {
      telemetry.metrics.startTimeToProposal();
    } catch {}

    try {
      let stage: string = 'init';
      const { sessionId, userId } = await getUserContext();
      const { brief } = useBriefStore.getState();
      const requestId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      // Track proposal generation started
      // NOTE: Client is the canonical emitter for STARTED/COMPLETED.
      // Server will only emit intermediate phases (PDF_START, UPLOAD_START, DB_START).
      telemetry.track(telemetry.events.PROPOSAL_GENERATION_STARTED, {
        itemCount: items.length,
        hasBrief: !!brief,
        sessionId,
        userId,
        requestId,
      });
      if (process.env.NODE_ENV !== 'production') {
        try { console.log('[Timeline] T0 PROPOSAL_GENERATION_STARTED', { requestId }); } catch {}
      }

      const body = {
        brief: brief || {},
        items,
        locale: (brief?.locale as 'es' | 'en') || language || 'es',
        requestId,
      };

      stage = 'request';
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      stage = 'response';
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        const message = err?.message || `HTTP ${res.status}`;
        const error = new Error(message);
        (error as any).stage = stage;
        throw error;
      }

      stage = 'parse';
      const data: { url: string | null; urlKind?: 'signed' | 'public' | 'none' | string; id?: string; pages?: number; bytes?: number; requestId?: string } = await res.json();

      const durationMs = typeof startTs === 'number' ? Math.max(0, Math.round(Date.now() - startTs)) : undefined;
      // Ensure urlKind and hasBrief are always populated; urlKind normalized to signed/public/none/unknown
      telemetry.track(telemetry.events.PROPOSAL_GENERATION_COMPLETED, {
        itemCount: items.length,
        hasBrief: !!brief,
        pages: data.pages,
        bytes: data.bytes,
        urlKind: normalizeUrlKind(data?.urlKind, data?.url),
        durationMs,
        sessionId,
        userId,
        requestId: data?.requestId || requestId,
      });
      if (process.env.NODE_ENV !== 'production') {
        try { console.log('[Timeline] T3 PROPOSAL_GENERATION_COMPLETED', { requestId: data?.requestId || requestId }); } catch {}
      }

      try {
        telemetry.metrics.endTimeToProposalIfStarted();
      } catch {}

      setResultUrl(data.url || null);
      setResultId(data.id || null);

      // Auto-hide inline action bar after a short delay (no effect loop)
      try {
        setTimeout(() => {
          setResultUrl(null);
          setResultId(null);
        }, 6000);
      } catch {}

      // Announce via toast (aria-live handled by Toaster/UI layer)
      toast({
        title: t('proposal.created') || 'Proposal created',
        description: t('proposal.ready') || 'Your PDF is ready to share',
      });

      // Additionally, dispatch a custom event for any global Toaster that supports actions
      try {
        if (typeof window !== 'undefined') {
          const detail = {
            title: t('proposal.created'),
            description: t('proposal.ready'),
            actions: [
              { label: t('proposal.open'), kind: 'primary', url: data.url },
              { label: t('proposal.copyLink'), kind: 'secondary', url: data.url },
            ],
          } as any;
          window.dispatchEvent(new CustomEvent('briki:toast', { detail }));
        }
      } catch {}

    } catch (error: any) {
      try {
        const { sessionId, userId } = await getUserContext();
        const { brief } = useBriefStore.getState();
        const stage = error?.stage || error?.cause?.stage || 'unknown';
        const telemetryError = normalizeError(error, stage);
        telemetry.track(telemetry.events.PROPOSAL_GENERATION_FAILED, {
          itemCount: items.length,
          hasBrief: !!brief,
          ...telemetryError,
          sessionId,
          userId,
        });
        try { telemetry.metrics.endTimeToProposalIfStarted(); } catch {}
      } catch {}

      toast({
        title: t('proposal.error') || 'Failed to generate proposal',
        description: error instanceof Error ? error.message : String(error || ''),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpen = async () => {
    if (!resultUrl) return;
    try {
      const { sessionId, userId } = await getUserContext();
      telemetry.track(telemetry.events.PROPOSAL_OPENED, { url: resultUrl, id: resultId, sessionId, userId });
    } catch {}
    window.open(resultUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!resultUrl) return;
    try {
      await navigator.clipboard.writeText(resultUrl);
      const { sessionId, userId } = await getUserContext();
      telemetry.track('proposal.share.link', { url: resultUrl, id: resultId, sessionId, userId });
      toast({ title: t('proposal.copyLink') || 'Copy link', description: resultUrl });
    } catch (e) {
      toast({ title: t('proposal.copyLink') || 'Copy link', description: t('common.error') || 'Error', variant: 'destructive' });
    }
  };

  const resolvedDensity: DensityPreset = density || 'comfortable';
  const presetButtonSize: ButtonSize = resolvedDensity === 'compact' ? 'default' : 'lg';
  const effectiveSize: ButtonSize = size || presetButtonSize;
  const gapClass = resolvedDensity === 'compact' ? 'gap-1.5' : 'gap-2';

  return (
    <div className={`inline-flex items-center ${gapClass}`}>
      <Button
        onClick={handleGenerate}
        disabled={isDisabled}
        size={effectiveSize}
        variant={variant}
        className={`${className} inline-flex items-center ${gapClass}`}
        aria-label={t('proposal.create')}
        aria-disabled={isDisabled}
        data-testid="create-proposal-button"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="hidden md:inline">{t('proposal.generating')}</span>
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            <span className="hidden md:inline">{t('proposal.create')}</span>
          </>
        )}
      </Button>

      {/* Inline action bar mirrors toast actions (for environments without a Toaster) */}
      {resultUrl && (
        <div className={`flex items-center ${gapClass}`}>
          <Button
            variant="outline"
            size={effectiveSize}
            onClick={handleOpen}
            aria-label={t('proposal.open')}
            className={`inline-flex items-center ${gapClass}`}
          >
            <ExternalLink className="h-5 w-5" />{t('proposal.open')}
          </Button>
          <Button
            variant="ghost"
            size={effectiveSize}
            onClick={handleCopy}
            aria-label={t('proposal.copyLink')}
            className={`inline-flex items-center ${gapClass}`}
          >
            <Copy className="h-5 w-5" />{t('proposal.copyLink')}
          </Button>
        </div>
      )}

      {/* Live region for progress updates */}
      <span className="sr-only" role="status" aria-live="polite">
        {isGenerating ? t('proposal.generating') : ''}
      </span>
    </div>
  );
}


