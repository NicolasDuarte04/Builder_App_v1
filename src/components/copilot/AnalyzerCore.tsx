'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProposal } from '@/state/proposal';
import { Loader2, CheckCircle, AlertTriangle, Shield, FileText } from 'lucide-react';
import { AttachedFilesList } from './AttachedFilesList';
import dynamic from 'next/dynamic';
import { telemetry, getUserContext, getSafeFileMetadata, normalizeError } from '@/lib/telemetry';
import { now, since } from '@/lib/time';
import { useAnalyzer } from '@/state/analyzer';
import { useUI } from '@/state/ui';
import { ENABLE_BRC_PORTAL } from '@/lib/featureFlags';
import { FLAGS } from '@/lib/flags';
import { useBriefStore } from '@/state/briefStore';
import type { Brief } from '@/types/brief';
import { useTranslation } from '@/hooks/useTranslation';

// Render-safe telemetry dedupe (module-level) for Analyzer lifecycle
const ANALYZER_TELEMETRY_KEYS = new Set<string>();
let ANALYZER_TELEMETRY_TOKEN = 0; // increment on new upload/analysis lifecycle

function markAndShouldSkipAnalyzer(eventName: string, signature: string) {
  const key = `${ANALYZER_TELEMETRY_TOKEN}|${eventName}|${signature}`;
  if (ANALYZER_TELEMETRY_KEYS.has(key)) return true;
  ANALYZER_TELEMETRY_KEYS.add(key);
  return false;
}

// Lazy load the existing analyzer display
const PolicyAnalysisDisplay = (dynamic(
  () => import('@/components/assistant/PolicyAnalysisDisplay').then(
    (mod) => mod.PolicyAnalysisDisplay as any
  ),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
  }
) as any);

interface AttachedPDF {
  file: File;
  id: string;
  isPrimary: boolean;
  previewUrl?: string;
}

interface AnalyzerCoreProps {
  plan?: any | null;
  onAnalysisComplete?: (payload: { analysisSummary: string; analysis?: any }) => void;
  variant?: 'panel' | 'sheet';
}

export function AnalyzerCore({ plan, onAnalysisComplete, variant = 'panel' }: AnalyzerCoreProps) {
  const attachAnalysis = useProposal((s) => s.attachAnalysis);
  const setUiPhase = useProposal((s) => s.setUiPhase);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedPDF[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const primaryFile = useMemo(() => attachedFiles.find(f => f.isPrimary), [attachedFiles]);
  const isMultiPdfEnabled = FLAGS.multiPdf;
  const analysisStartRef = useRef<number | null>(null);
  const analysisPrepBullets = useMemo(() => {
    const b = t('upload.analysis_prep.bullets') as any;
    return Array.isArray(b) ? (b as string[]) : [];
  }, [t]);
  
  // Merge helper: apply parsed brief into store honoring dirty fields (client wins)
  const mergeParsedBriefIntoStore = async (
    parsed: Partial<Brief>,
    source: 'paste' | 'upload'
  ) => {
    try {
      const store = useBriefStore.getState();
      const current = store.brief;
      const dirty = store.dirtyFields || new Set<keyof Brief>();

      if (!parsed || (parsed as any).error) return;

      if (!current) {
        const { sessionId, userId } = await getUserContext();
        const now = new Date().toISOString();
        const initial: Brief = {
          id: `brief-${Date.now()}`,
          userId: userId || 'anonymous',
          sessionId: sessionId || 'unknown',
          clientId: undefined,
          locale: 'es',
          source,
          category: parsed.category ?? null,
          maxBudgetCop: parsed.maxBudgetCop ?? null,
          mustHaveCoverages: parsed.mustHaveCoverages ?? [],
          exclusions: parsed.exclusions,
          clientPersona: parsed.clientPersona,
          notes: parsed.notes,
          rawText: parsed.rawText,
          docRefs: parsed.docRefs,
          createdAt: now,
          updatedAt: now,
          version: 1,
          isApplied: false,
        };
        store.setBrief(initial);
        return;
      }

      const patch: Partial<Brief> = {};

      if (parsed.category && !dirty.has('category')) patch.category = parsed.category;
      if (typeof parsed.maxBudgetCop === 'number' && parsed.maxBudgetCop > 0 && !dirty.has('maxBudgetCop')) patch.maxBudgetCop = parsed.maxBudgetCop;
      if (Array.isArray(parsed.mustHaveCoverages) && parsed.mustHaveCoverages.length > 0 && !dirty.has('mustHaveCoverages')) {
        const union = Array.from(new Set([...(current.mustHaveCoverages || []), ...parsed.mustHaveCoverages]));
        patch.mustHaveCoverages = union;
      }
      if (parsed.clientPersona && !dirty.has('clientPersona')) patch.clientPersona = parsed.clientPersona;
      if (parsed.notes && !dirty.has('notes')) patch.notes = parsed.notes;
      if (parsed.rawText) patch.rawText = parsed.rawText;
      patch.source = source;

      if (Array.isArray(parsed.docRefs) && parsed.docRefs.length > 0) {
        const existing = current.docRefs || [];
        const combined = [...existing, ...parsed.docRefs];
        const byRef = new Map<string, NonNullable<Brief['docRefs']>[number]>();
        for (const ref of combined) {
          if (ref && ref.ref) byRef.set(ref.ref, ref);
        }
        patch.docRefs = Array.from(byRef.values());
      }

      const dirtyField: keyof Brief | undefined = (
        (patch.category ? 'category' : undefined) ||
        (patch.maxBudgetCop !== undefined ? 'maxBudgetCop' : undefined) ||
        (patch.mustHaveCoverages ? 'mustHaveCoverages' : undefined) ||
        (patch.clientPersona ? 'clientPersona' : undefined) ||
        (patch.notes ? 'notes' : undefined) ||
        ('rawText')
      ) as keyof Brief | undefined;

      store.updateBrief(patch, dirtyField ? { field: dirtyField } : undefined);
    } catch (e) {
      console.error('[mergeParsedBriefIntoStore] error:', e);
    }
  };
  
  // Cleanup preview URLs on unmount
  useEffect(() => () => {
    attachedFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
  }, [attachedFiles]);

  const handleSetPrimary = (id: string) => {
    setAttachedFiles(prev => prev.map(f => ({
      ...f,
      isPrimary: f.id === id
    })));
    
    // Telemetry for primary PDF selection
    getUserContext().then(({ sessionId, userId }) => {
      const primaryFile = attachedFiles.find(f => f.id === id)?.file;
      if (primaryFile) {
        telemetry.track(telemetry.events.PDF_PRIMARY_SET, {
          fileCount: attachedFiles.length,
          file: getSafeFileMetadata(primaryFile),
          sessionId,
          userId
        });
      }
    });

    // Announce change for screen readers
    window.dispatchEvent(new CustomEvent('briki:announce', {
      detail: { message: t('upload.primary_pdf_set') }
    }));
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      // If removing primary, make last added file primary
      if (prev.find(f => f.id === id)?.isPrimary && filtered.length > 0) {
        filtered[filtered.length - 1].isPrimary = true;
      }
      return filtered;
    });
  };

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const invalidFiles = files.filter(f => f.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      setFileError(String(t('upload.errors.pdfOnly')));
      return;
    }
    setFileError(null);

    // Process new files
    const newFiles = files.map((f, idx) => ({
      file: f,
      id: crypto.randomUUID(),
      isPrimary: !isMultiPdfEnabled || (!attachedFiles.length && idx === files.length - 1),
      previewUrl: URL.createObjectURL(f)
    }));

    // Update state
    setAttachedFiles(prev => {
      const combined = isMultiPdfEnabled ? [...prev, ...newFiles] : newFiles;
      // Ensure exactly one primary file
      if (combined.length && !combined.some(f => f.isPrimary)) {
        combined[combined.length - 1].isPrimary = true;
      }
      return combined;
    });

    analysisStartRef.current = Date.now();
    
    // Store primary file globally
    const primaryFile = newFiles.find(f => f.isPrimary)?.file;
    if (primaryFile) {
      useAnalyzer.getState().setFile(primaryFile);
      if (ENABLE_BRC_PORTAL) {
        try { useUI.getState().setLayoutMode('analysis_portal_prep'); } catch {}
      }
    }

    // Announce for screen readers
    const message = isMultiPdfEnabled && files.length > 1 
      ? String(t('upload.multiple_pdfs_added')).replace('{count}', String(files.length))
      : String(t('upload.pdf_added'));
    window.dispatchEvent(new CustomEvent('briki:announce', { detail: { message } }));
    
    // Fire events
    window.dispatchEvent(new CustomEvent("briki:pdf-selected", {
      detail: { 
        name: primaryFile?.name, 
        size: primaryFile?.size, 
        type: primaryFile?.type,
        totalFiles: files.length
      }
    }));

    // Telemetry
    // New upload lifecycle: reset dedupe token so emissions are fresh
    ANALYZER_TELEMETRY_TOKEN += 1;
    ANALYZER_TELEMETRY_KEYS.clear();
    getUserContext().then(({ sessionId, userId }) => {
      // Track file attachment
      const attachSig = `count:${files.length}|bytes:${files.reduce((sum, f) => sum + f.size, 0)}`;
      if (!markAndShouldSkipAnalyzer(telemetry.events.PDFS_ATTACHED, attachSig)) {
        telemetry.track(telemetry.events.PDFS_ATTACHED, {
          fileCount: files.length,
          totalBytes: files.reduce((sum, f) => sum + f.size, 0),
          files: files.map(f => getSafeFileMetadata(f)),
          sessionId,
          userId
        });
      }

      // Track primary file selection
      if (primaryFile) {
        const meta = getSafeFileMetadata(primaryFile);
        const selectedSig = `${meta.ext}|${meta.sizeBytes}|${meta.fileHashShort}`;
        if (!markAndShouldSkipAnalyzer(telemetry.events.ANALYZER_FILE_SELECTED, selectedSig)) {
          telemetry.track(telemetry.events.ANALYZER_FILE_SELECTED, {
            file: meta,
            sizeBucket: primaryFile.size < 1024 * 1024 ? 'small' : primaryFile.size < 5 * 1024 * 1024 ? 'medium' : 'large',
            hasPlan: !!plan,
            isMultiPdf: isMultiPdfEnabled,
            sessionId,
            userId
          });
        }

        const startedSig = `${meta.ext}|${meta.sizeBytes}|${meta.fileHashShort}`;
        if (!markAndShouldSkipAnalyzer(telemetry.events.PDF_ANALYSIS_STARTED, startedSig)) {
          telemetry.track(telemetry.events.PDF_ANALYSIS_STARTED, {
            bytes: primaryFile.size,
            sessionId,
            userId,
          });
        }
      }
    });
  }

  const handleAnalyze = async () => {
    setFileError(null);
    setUploadStatus('idle');
    setUploadProgress(0);

    if (plan) {
      if (!plan.source_url) { 
        setFileError(String(t('policy.noPdf'))); 
        setUploadStatus('error');
        return; 
      }
    } else {
      if (!primaryFile) { 
        setFileError(String(t('upload.upload_prompt'))); 
        setUploadStatus('error');
        return; 
      }
    }
    
    // Client-side size guard (10MB) for non-portal path
    if (!plan && primaryFile && typeof primaryFile.file.size === 'number') {
      const LIMIT = 10 * 1024 * 1024;
      if (primaryFile.file.size > LIMIT) {
        const sizeMB = Number((primaryFile.file.size / (1024 * 1024)).toFixed(1));
        const error = normalizeError({ status: 413 }, 'file_validation');
        try { getUserContext().then(({ sessionId, userId }) => { telemetry.track(telemetry.events.FILE_SIZE_REJECTED, { sizeMB, limitMB: 10, ...error, sessionId, userId }); }); } catch {}
        setFileError(`${t('upload.errors.tooLarge')} (${sizeMB} MB > 10 MB)`);
        setUploadStatus('error');
        return;
      }
    }

    const t0 = now();
    // Reset dedupe guard for plan-only analysis lifecycle (no file upload path)
    // Ensures a fresh token so render re-runs won't re-emit and new runs can emit again
    if (plan && !primaryFile) {
      ANALYZER_TELEMETRY_TOKEN += 1;
      ANALYZER_TELEMETRY_KEYS.clear();
    }
    setUploadStatus('uploading');
    
    try {
      setIsAnalyzing(true);
      setUiPhase('analyzing_pdf'); // advance phase only now
      setUploadStatus('analyzing');
      
      // Telemetry for analysis start
      try {
        const { sessionId, userId } = await getUserContext();
        const sig = `plan:${plan?.id ?? 'none'}|hasFile:${!!primaryFile}|size:${primaryFile?.file.size ?? 0}`;
        if (!markAndShouldSkipAnalyzer(telemetry.events.ANALYZER_RUN_STARTED, sig)) {
          telemetry.track(telemetry.events.ANALYZER_RUN_STARTED, {
            hasPlan: !!plan,
            planId: plan?.id,
            hasFile: !!primaryFile,
            fileSize: primaryFile?.file.size,
            sessionId,
            userId,
          });
        }
      } catch {}
      
      // Build payload
      if (!plan && primaryFile) {
        const fd = new FormData();
        fd.append('file', primaryFile.file);
        
        // Call the analysis endpoint with 413 handling
        const res = await fetch('/api/ai/analyze-policy', { method: 'POST', body: fd });
        if (!res.ok && res.status === 413) {
          let limitMB = 10;
          try { const j = await res.json(); if (j?.limitMB) limitMB = Number(j.limitMB) || 10; } catch {}
          setFileError(String(t('upload.errors.tooLarge')));
          setIsAnalyzing(false);
          setUiPhase('welcome');
          setUploadStatus('error');
          return;
        }
        
        // Handle 202 Accepted (async processing)
        if (res.status === 202) {
          const data = await res.json();
          // For now, just treat as success - full async handling would poll status
          onAnalysisComplete?.({ 
            analysisSummary: 'Análisis en proceso. Por favor espera...',
            analysis: null
          });
          setUploadStatus('success');
          return;
        }
        
        // Handle other errors
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          
          // Check for OCR_FAILED error
          if (errorData.error_code === 'OCR_FAILED' || errorData.code === 'OCR_FAILED') {
            setFileError(String(t('upload.errors.ocrFailed') || 'No se pudo extraer texto del PDF. Por favor, sube un PDF con texto seleccionable en lugar de una imagen escaneada.'));
            try {
              const { sessionId, userId } = await getUserContext();
              const error = normalizeError({ error_code: 'OCR_FAILED' }, 'pdf_analysis');
              telemetry.track(telemetry.events.PDF_ANALYSIS_FAILED, {
                ...error,
                uploadId: errorData.uploadId,
                sessionId,
                userId,
              });
            } catch {
              const error = normalizeError({ error_code: 'OCR_FAILED' }, 'pdf_analysis');
              telemetry.track(telemetry.events.PDF_ANALYSIS_FAILED, {
                ...error,
                uploadId: errorData.uploadId,
              });
            }
          } else {
            setFileError(errorData.message || String(t('upload.errors.unknown')));
          }
          
          setIsAnalyzing(false);
          setUiPhase('welcome');
          setUploadStatus('error');
          
          // Announce error for screen readers
          window.dispatchEvent(new CustomEvent('briki:announce', {
            detail: { message: String(t('upload.errors.analysis_failed')) }
          }));
          return;
        }
        
        // Fallback for mock/dev:
        const data = res.ok ? await res.json() : { analysisSummary: 'Análisis de ejemplo (archivo subido sin backend real).' };
        
        // Telemetry for successful analysis
        const durationMs = Math.max(0, Math.round(since(t0)));
        const sig = `res_ok:${res.ok}|summary:${!!data.analysisSummary}|files:${attachedFiles.length}`;
        if (!markAndShouldSkipAnalyzer(telemetry.events.ANALYZER_RUN_SUCCEEDED, sig)) {
          telemetry.track(telemetry.events.ANALYZER_RUN_SUCCEEDED, {
            hasPlan: !!plan,
            planId: plan?.id,
            durationMs,
            success: res.ok,
            hasSummary: !!data.analysisSummary,
            isMultiPdf: isMultiPdfEnabled,
            totalFiles: attachedFiles.length
          });
        }

        // PDF analysis completed (file path)
        try {
          const t0 = analysisStartRef.current;
          const durationMs = typeof t0 === 'number' ? Math.max(0, Math.round(Date.now() - t0)) : undefined;
          const { sessionId, userId } = await getUserContext();
          const sig2 = `bytes:${primaryFile.file.size}|pages:${(data && typeof data.pages === 'number') ? data.pages : 'na'}|durationMs:${durationMs}`;
          if (!markAndShouldSkipAnalyzer(telemetry.events.PDF_ANALYSIS_COMPLETED, sig2)) {
            telemetry.track(telemetry.events.PDF_ANALYSIS_COMPLETED, {
              bytes: primaryFile.file.size,
              pages: (data && typeof data.pages === 'number') ? data.pages : undefined,
              durationMs,
              isMultiPdf: isMultiPdfEnabled,
              totalFiles: attachedFiles.length,
              sessionId,
              userId,
            });
          }
          analysisStartRef.current = null;
        } catch {}
        
        onAnalysisComplete?.({ 
          analysisSummary: data.analysisSummary ?? 'Análisis en proceso.',
          analysis: data.analysis
        });

        setUploadStatus('success');
        
        // Announce success for screen readers
        window.dispatchEvent(new CustomEvent('briki:announce', {
          detail: { message: String(t('upload.analysis_completed')) }
        }));

          // If we have an uploadId, trigger brief parsing from PDF once (no polling required)
          try {
            const uploadId: string | undefined = typeof data?.uploadId === 'string' ? data.uploadId : undefined;
            if (uploadId) {
              // Optionally record parse requested (not required but helpful)
              try {
                const { sessionId, userId } = await getUserContext();
                telemetry.track(telemetry.events.BRIEF_PARSE_REQUESTED, { source: 'upload', uploadId, sessionId, userId });
              } catch {}

              const resp = await fetch(`/api/briefs/parse-from-pdf?uploadId=${encodeURIComponent(uploadId)}`, { method: 'GET' });
              const parsed = await resp.json();
              if (parsed && !parsed.error) {
                const fieldsFilled = Object.keys(parsed).filter(k => {
                  const v = (parsed as any)[k];
                  if (v === null || v === undefined) return false;
                  if (Array.isArray(v)) return v.length > 0;
                  if (typeof v === 'object') return Object.keys(v).length > 0;
                  return true;
                });
                try {
                  const { sessionId, userId } = await getUserContext();
                  telemetry.track(telemetry.events.BRIEF_PARSED_SUCCESS, { source: 'pdf', fieldsFilled, uploadId, sessionId, userId });
                } catch {
                  telemetry.track(telemetry.events.BRIEF_PARSED_SUCCESS, { source: 'pdf', fieldsFilled, uploadId });
                }

                // Add the PDF to Brief's docRefs
                const docRef = {
                  type: 'pdf' as const,
                  ref: uploadId,
                  title: primaryFile?.file.name || 'policy.pdf',
                  extractedAt: new Date().toISOString()
                };

                // Merge parsed brief with docRef
                await mergeParsedBriefIntoStore({ 
                  ...(parsed as Partial<Brief>),
                  docRefs: [docRef]
                }, 'upload');

                // Announce for screen readers
                window.dispatchEvent(new CustomEvent('briki:announce', {
                  detail: { message: t('upload.pdf_added_to_brief') }
                }));
              } else {
                const error = normalizeError({ message: 'schema mismatch' }, 'brief_parsing');
                telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, { source: 'pdf', uploadId, ...error });
              }
            }
          } catch (err) {
            console.error('[analyzer→parsePdf] error:', err);
            const error = normalizeError(err, 'brief_parsing');
            try { telemetry.track(telemetry.events.PARSER_OUTPUT_SCHEMA_MISMATCH, { source: 'pdf', ...error }); } catch {}
          }
      } else {
        // Plan path - use existing mock logic
        setTimeout(async () => {
          const mockAnalysis = {
            policyType: plan?.name_es ?? 'Póliza General',
            premium: { 
              amount: plan?.plan_pricing?.[0]?.premium_min || 0, 
              currency: "COP", 
              frequency: "monthly" 
            },
            coverage: { 
              limits: { 
                medical: 50000000, 
                property: 100000000,
                liability: 200000000,
                theft: 150000000
              }, 
              deductibles: { 
                general: 500000,
                glass: 200000,
                theft: 750000
              }, 
              exclusions: [
                "Condiciones preexistentes", 
                "Actos criminales",
                "Daños intencionales",
                "Desgaste normal"
              ],
              geography: "Nacional e internacional",
              claimInstructions: [
                "Llamar a línea de emergencia 24/7",
                "Reportar dentro de 48 horas",
                "Presentar documentación completa"
              ]
            },
            policyDetails: { 
              policyNumber: `POL-${Date.now()}`,
              insured: ["Titular", "Cónyuge", "Hijos menores de 25 años"], 
              effectiveDate: new Date().toISOString().split('T')[0],
              expirationDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
            },
            insurer: {
              name: plan?.insurers?.name ?? 'Aseguradora',
              contact: "01 8000 123 456",
              emergencyLines: ["311 234 5678", "01 8000 911 911"]
            },
            keyFeatures: [
              "Cobertura nacional e internacional",
              "Asistencia 24/7 incluida", 
              "Sin copagos en red preferencial",
              "Reemplazo de vehículo por 15 días",
              "Grúa sin límite de kilometraje"
            ],
            recommendations: [
              "Revisar exclusiones específicas del modelo de vehículo",
              "Considerar aumentar límite de responsabilidad civil",
              "Verificar talleres de red cercanos a tu zona"
            ],
            riskScore: 4,
            riskJustification: "Excelente cobertura con deducibles razonables. Algunas exclusiones estándar del mercado.",
            sourceQuotes: {
              deductible: "El deducible general es del 10% del valor del siniestro, mínimo $500,000",
              coverage: "Cobertura integral con límite de $200,000,000 en responsabilidad civil"
            },
            redFlags: [
              "Deducible alto para cristales",
              "Exclusión de vehículos de más de 15 años"
            ],
            missingInfo: [
              "Detalle completo de talleres en red",
              "Proceso específico para siniestros en el exterior"
            ]
          };
          
          setAnalysis(mockAnalysis);
          setIsAnalyzing(false);
          setUiPhase('processing');
          
          // Telemetry for successful mock analysis
          const durationMs = Math.max(0, Math.round(since(t0)));
          try {
            const { sessionId, userId } = await getUserContext();
            telemetry.track(telemetry.events.ANALYZER_RUN_SUCCEEDED, {
              hasPlan: !!plan,
              planId: plan?.id,
              durationMs,
              success: true,
              isMock: true,
              hasSummary: true,
              sessionId,
              userId,
            });
          } catch {}

          // PDF analysis completed (plan path - no file size)
          try {
            const { sessionId, userId } = await getUserContext();
            telemetry.track(telemetry.events.PDF_ANALYSIS_COMPLETED, {
              bytes: undefined,
              pages: undefined,
              durationMs,
              sessionId,
              userId,
            });
          } catch {}
          
          // Call completion with mock analysis
          onAnalysisComplete?.({
            analysisSummary: 'Análisis completado con datos de ejemplo.',
            analysis: mockAnalysis
          });
        }, 2500);
        return;
      }
      
      setUiPhase('processing');
      } catch (e) {
      setFileError(String(t('upload.errors.unknown')));
      setUploadStatus('error');
      
      // Telemetry for failed analysis
      const durationMs = Math.max(0, Math.round(since(t0)));
      try {
        const { sessionId, userId } = await getUserContext();
        const error = normalizeError(e, 'analyzer_run');
        telemetry.track(telemetry.events.ANALYZER_RUN_FAILED, {
          hasPlan: !!plan,
          planId: plan?.id,
          durationMs,
          ...error,
          hasFile: !!primaryFile,
          sessionId,
          userId,
        });
      } catch {}

      // PDF analysis failed
      try {
        const t0 = analysisStartRef.current;
        const durationMs = typeof t0 === 'number' ? Math.max(0, Math.round(Date.now() - t0)) : undefined;
        const { sessionId, userId } = await getUserContext();
        const error = normalizeError(e, 'pdf_processing');
        telemetry.track(telemetry.events.PDF_ANALYSIS_FAILED, {
          ...error,
          durationMs,
          sessionId,
          userId,
        });
        analysisStartRef.current = null;
      } catch {}

      // Announce error for screen readers
      window.dispatchEvent(new CustomEvent('briki:announce', {
        detail: { message: String(t('upload.errors.analysis_failed')) }
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAttach = () => {
    if (plan && analysis) {
      attachAnalysis(plan.id, analysis);
    }
  };

  // Reset file state when plan changes
  useEffect(() => {
    setAttachedFiles([]);
    setFileError(null);
    setAnalysis(null);
    setError(null);
  }, [plan]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        
        {plan && (
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {plan.insurers?.name ?? 'Aseguradora'}
            </Badge>
            {plan.plan_pricing?.[0] && (
              <Badge variant="outline" className="text-xs">
                ${plan.plan_pricing[0].premium_min?.toLocaleString() ?? 'N/A'} COP
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Análisis completado</span>
          </div>
          
          {/* Main Analysis Display */}
          <PolicyAnalysisDisplay 
            analysis={analysis} 
            pdfUrl={plan?.source_url ?? primaryFile?.previewUrl}
            fileName={plan?.name_es ?? primaryFile?.file.name ?? 'Poliza.pdf'}
            hideSave={true}
            hidePdfViewer={true}
          />
          
          {/* Action Buttons */}
          {plan && (
            <div className="flex gap-2">
              <Button 
                onClick={handleAttach}
                className="flex-1"
              >
                Adjuntar análisis al plan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload/Analysis Section */}
      {!analysis && (
        <div className="space-y-4">
          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{String(t('upload.analysis_prep.title'))}</p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            {analysisPrepBullets.length > 0 ? (
              analysisPrepBullets.map((label, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {idx === analysisPrepBullets.length - 1 ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  )}
                  <span>{label}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Detailed coverage and limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Important deductibles and exclusions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Personalized recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <span>Alerts about important clauses</span>
                </li>
              </>
            )}
          </ul>
          
          {/* Attached Files List */}
          {isMultiPdfEnabled && (
            <AttachedFilesList
              files={attachedFiles}
              onSetPrimary={handleSetPrimary}
              onRemove={handleRemoveFile}
            />
          )}

          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { 
              e.preventDefault(); 
              setIsDragging(false);
              const files = e.dataTransfer.files;
              if (files?.length) { 
                (inputRef.current as HTMLInputElement).files = files;
                handleFilePick({ target: inputRef.current! } as any); 
              } 
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={String(t('upload.upload_prompt'))}
            aria-describedby="upload-hint"
            aria-dropeffect={isDragging ? 'copy' : undefined}
            className="rounded-md border border-dashed p-6 text-center bg-muted/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <input 
              ref={inputRef} 
              type="file" 
              accept="application/pdf" 
              hidden 
              aria-hidden="true" 
              onChange={handleFilePick}
              multiple={isMultiPdfEnabled}
            />
            {attachedFiles.length === 0 ? (
              <>
                <p id="upload-hint" className="text-sm text-muted-foreground mb-1">
                  {isMultiPdfEnabled 
                    ? String(t('upload.dropInstructionMulti'))
                    : String(t('upload.dropInstruction'))
                  }
                </p>
                <p className="text-xs text-muted-foreground mb-3">{String(t('upload.fileRequirements'))}</p>
                <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
                  {isMultiPdfEnabled 
                    ? String(t('upload.choose_pdfs'))
                    : String(t('upload.choose_pdf'))
                  }
                </Button>
                {fileError && <p className="mt-2 text-sm text-red-500">{fileError}</p>}
              </>
            ) : !isMultiPdfEnabled && (
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-medium">{primaryFile?.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(primaryFile?.file.size ?? 0/1024/1024).toFixed(2)} MB
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setAttachedFiles([])}
                >
                  {String(t('upload.remove_file'))}
                </Button>
                <span id="upload-hint" className="sr-only">{String(t('upload.dropInstruction'))}</span>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || (!!plan ? !plan.source_url : !primaryFile)}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {String(t('upload.analyzing'))}
                <span role="status" aria-live="polite" className="sr-only">{String(t('upload.status.analyzing_pdf'))}</span>
              </>
            ) : (
              String(t('upload.analyzeButton'))
            )}
          </Button>
          
          {/* Helper Text */}
          {plan && !plan.source_url && (
            <p className="text-xs text-destructive">
              {String(t('policy.noPdf'))}
            </p>
          )}
          {!plan && !primaryFile && (
            <p className="text-xs text-muted-foreground">
              {String(t('upload.upload_prompt'))}
            </p>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
