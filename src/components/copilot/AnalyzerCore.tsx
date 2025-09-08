'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProposal } from '@/state/proposal';
import { Loader2, CheckCircle, AlertTriangle, Shield, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import { telemetry } from '@/lib/telemetry';
import { useAnalyzer } from '@/state/analyzer';
import { useUI } from '@/state/ui';
import { ENABLE_BRC_PORTAL } from '@/lib/featureFlags';

// Lazy load the existing analyzer display
const PolicyAnalysisDisplay = dynamic(
  () => import('@/components/assistant/PolicyAnalysisDisplay').then(
    (mod) => mod.PolicyAnalysisDisplay as any
  ),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
  }
);

interface AnalyzerCoreProps {
  plan?: any | null;
  onAnalysisComplete?: (payload: { analysisSummary: string; analysis?: any }) => void;
  variant?: 'panel' | 'sheet';
}

export function AnalyzerCore({ plan, onAnalysisComplete, variant = 'panel' }: AnalyzerCoreProps) {
  const { attachAnalysis, setUiPhase } = useProposal();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
  
  useEffect(() => () => { 
    if (previewUrl) URL.revokeObjectURL(previewUrl); 
  }, [previewUrl]);

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setFile(null); return; }
    if (f.type !== 'application/pdf') { setFileError('Por favor sube un archivo PDF.'); return; }
    setFileError(null);
    setFile(f);
    
    // NEW: store globally + event for layout transition
    useAnalyzer.getState().setFile(f);
    // Belt-and-suspenders: ensure portal mode immediately if flag is on
    if (ENABLE_BRC_PORTAL) {
      try { useUI.getState().setLayoutMode('analysis_portal_prep'); } catch {}
    }
    window.dispatchEvent(new CustomEvent("briki:pdf-selected", {
      detail: { name: f.name, size: f.size, type: f.type }
    }));
    
    // Telemetry for file selection
    telemetry.track(telemetry.events.ANALYZER_FILE_SELECTED, {
      mimeType: f.type,
      sizeBucket: f.size < 1024 * 1024 ? 'small' : f.size < 5 * 1024 * 1024 ? 'medium' : 'large',
      fileSize: f.size,
      hasPlan: !!plan
    });
  }

  const handleAnalyze = async () => {
    setFileError(null);
    if (plan) {
      if (!plan.source_url) { 
        setFileError('Este plan no tiene PDF para analizar.'); 
        return; 
      }
    } else {
      if (!file) { 
        setFileError('Sube un PDF para comenzar.'); 
        return; 
      }
    }
    
    const startTime = Date.now();
    
    try {
      setIsAnalyzing(true);
      setUiPhase('analyzing_pdf'); // advance phase only now
      
      // Telemetry for analysis start
      telemetry.track(telemetry.events.ANALYZER_RUN_STARTED, {
        hasPlan: !!plan,
        planId: plan?.id,
        hasFile: !!file,
        fileSize: file?.size
      });
      
      // Build payload
      if (!plan && file) {
        const fd = new FormData();
        fd.append('file', file);
        
        // Call the analysis endpoint
        const res = await fetch('/api/ai/analyze-policy', { method: 'POST', body: fd });
        
        // Fallback for mock/dev:
        const data = res.ok ? await res.json() : { analysisSummary: 'Análisis de ejemplo (archivo subido sin backend real).' };
        
        // Telemetry for successful analysis
        const duration = Date.now() - startTime;
        telemetry.track(telemetry.events.ANALYZER_RUN_SUCCEEDED, {
          hasPlan: !!plan,
          planId: plan?.id,
          duration,
          success: res.ok,
          hasSummary: !!data.analysisSummary
        });
        
        onAnalysisComplete?.({ 
          analysisSummary: data.analysisSummary ?? 'Análisis completado.',
          analysis: data.analysis
        });
      } else {
        // Plan path - use existing mock logic
        setTimeout(() => {
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
          const duration = Date.now() - startTime;
          telemetry.track(telemetry.events.ANALYZER_RUN_SUCCEEDED, {
            hasPlan: !!plan,
            planId: plan?.id,
            duration,
            success: true,
            isMock: true,
            hasSummary: true
          });
          
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
      setFileError('Hubo un problema analizando el PDF.');
      
      // Telemetry for failed analysis
      const duration = Date.now() - startTime;
      telemetry.track(telemetry.events.ANALYZER_RUN_FAILED, {
        hasPlan: !!plan,
        planId: plan?.id,
        duration,
        error: e instanceof Error ? e.message : 'Unknown error',
        hasFile: !!file
      });
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
    setFile(null);
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
            pdfUrl={plan?.source_url ?? previewUrl}
            fileName={plan?.name_es ?? file?.name ?? 'Poliza.pdf'}
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
            <p className="text-sm text-muted-foreground">
              Briki analizará el archivo para extraer:
            </p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Coberturas detalladas y límites</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Deducibles y exclusiones importantes</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Recomendaciones personalizadas</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <span>Alertas sobre cláusulas importantes</span>
            </li>
          </ul>
          
          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { 
              e.preventDefault(); 
              const f = e.dataTransfer.files?.[0]; 
              if (f) { 
                (inputRef.current as HTMLInputElement).files = e.dataTransfer.files; 
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
            aria-label="Seleccionar archivo PDF para analizar"
            className="rounded-md border border-dashed p-6 text-center bg-muted/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={handleFilePick} />
            {!file ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">Sube un PDF para analizar</p>
                <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
                  Seleccionar PDF
                </Button>
                {fileError && <p className="mt-2 text-sm text-red-500">{fileError}</p>}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size/1024/1024).toFixed(2)} MB</div>
                </div>
                <Button type="button" variant="ghost" onClick={() => setFile(null)}>Quitar</Button>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || (!!plan ? !plan.source_url : !file)}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              'Analizar póliza ahora'
            )}
          </Button>
          
          {/* Helper Text */}
          {plan && !plan.source_url && (
            <p className="text-xs text-destructive">
              No hay documento disponible para este plan
            </p>
          )}
          {!plan && !file && (
            <p className="text-xs text-muted-foreground">
              Sube un PDF para analizar
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
