'use client';
// DEPRECATED: This component is no longer used. Analyzer now uses in-card panel.
// Keeping for reference but should be removed in future cleanup.

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProposal } from '@/state/proposal';
import { X, Loader2, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

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

interface AnalyzerDrawerProps {
  open: boolean;
  onClose: () => void;
  plan: any;
}

export function AnalyzerDrawer({ open, onClose, plan }: AnalyzerDrawerProps) {
  const attachAnalysis = useProposal((s) => s.attachAnalysis);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!plan?.source_url) return;
    
    setLoading(true);
    
    // In production, this would call your PDF analysis API
    // For now, simulate with mock data
    setTimeout(() => {
      const mockAnalysis = {
        policyType: plan.name_es,
        premium: { 
          amount: plan.plan_pricing?.[0]?.premium_min || 0, 
          currency: "COP", 
          frequency: "monthly" 
        },
        coverage: { 
          limits: { medical: 50000000, property: 100000000 }, 
          deductibles: { general: 500000 }, 
          exclusions: ["Condiciones preexistentes", "Actos criminales"] 
        },
        policyDetails: { 
          insured: ["Titular"], 
          effectiveDate: new Date().toISOString().split('T')[0],
          expirationDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
        },
        keyFeatures: [
          "Cobertura nacional e internacional",
          "Asistencia 24/7", 
          "Sin copagos en red preferencial"
        ],
        recommendations: [
          "Revisar exclusiones específicas",
          "Considerar aumentar límite de responsabilidad civil"
        ],
        riskScore: 4,
        riskJustification: "Buena cobertura con algunas exclusiones estándar",
        sourceQuotes: {},
        redFlags: [],
        missingInfo: ["Detalle de red de proveedores"]
      };
      
      setAnalysis(mockAnalysis);
      setLoading(false);
    }, 2000);
  };

  const handleAttach = () => {
    if (plan && analysis) {
      attachAnalysis(plan.id, analysis);
      onClose();
    }
  };

  if (!open || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl">
        <Card className="h-full rounded-none border-0 flex flex-col">
          <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle>Analizador de Póliza</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{plan.name_es}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-grow overflow-auto p-6">
            {!analysis && !loading && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-muted-foreground text-center">
                  Analiza el PDF de la póliza para extraer información detallada sobre coberturas, exclusiones y recomendaciones.
                </p>
                <Button onClick={handleAnalyze} disabled={!plan.source_url}>
                  Analizar PDF de póliza
                </Button>
                {!plan.source_url && (
                  <p className="text-sm text-destructive">
                    No hay URL de fuente disponible para este plan
                  </p>
                )}
              </div>
            )}
            
            {loading && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Analizando póliza...</p>
              </div>
            )}
            
            {analysis && (
              <div className="space-y-4">
                <PolicyAnalysisDisplay 
                  analysis={analysis} 
                  pdfUrl={plan.source_url}
                  fileName={plan.name_es}
                  hideSave={true}
                  hidePdfViewer={true}
                />
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleAttach} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Adjuntar análisis al plan
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
