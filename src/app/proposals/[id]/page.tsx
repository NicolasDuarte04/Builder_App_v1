'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { telemetry } from '@/lib/telemetry';
import { supabase } from '@/lib/supabase-client';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProposalPage() {
  const params = useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadProposal() {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error) {
        console.error('Error loading proposal:', error);
      } else {
        setProposal(data);
      }
      setLoading(false);
    }
    
    loadProposal();
  }, [params.id]);

  const handleWhatsAppShare = () => {
    if (!proposal) return;
    
    const whatsappText = `🚀 Propuesta de Seguro - Briki Co‑Pilot\n\n` +
      `📋 ID: ${proposal.id}\n` +
      `📅 Fecha: ${new Date(proposal.created_at).toLocaleDateString()}\n\n` +
      `✅ Planes seleccionados:\n` +
      (proposal.shortlist || []).map((p: any, i: number) => 
        `${i + 1}. ${p.name_es} - ${p.insurers?.name || 'N/A'}\n` +
        `   💰 Desde $${p.plan_pricing?.[0]?.premium_min || 'Consultar'}`
      ).join('\n') +
      `\n\n🔗 Ver detalles: ${window.location.href}`;
    
    telemetry.track(telemetry.events.PROPOSAL_SHARED_WHATSAPP, {
      proposalId: proposal.id,
      planCount: proposal.shortlist?.length || 0,
    });
    
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="container max-w-5xl py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Propuesta no encontrada
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Propuesta #{proposal.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Generada el {new Date(proposal.created_at).toLocaleDateString()} por Briki Co‑Pilot
          </p>
        </div>
        
        <Badge variant="outline" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Lista para enviar
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planes seleccionados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(proposal.shortlist || []).map((plan: any, index: number) => (
            <div key={plan.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    {index + 1}. {plan.name_es}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {plan.insurers?.name || 'Aseguradora'}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-medium">
                    {plan.plan_pricing?.[0] 
                      ? `$${plan.plan_pricing[0].premium_min} - $${plan.plan_pricing[0].premium_max}`
                      : 'Precio a consultar'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plan.plan_pricing?.[0]?.currency || 'COP'} / {plan.plan_pricing?.[0]?.billing_period || 'mes'}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(plan.plan_benefits || []).slice(0, 6).map((b: any) => (
                  <Badge key={b.key} variant="secondary" className="text-xs">
                    {b.key}
                  </Badge>
                ))}
              </div>
              
              {plan.source_url && (
                <a 
                  href={plan.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver póliza original
                </a>
              )}
              
              {plan.analysis && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm font-medium mb-2">Análisis adjunto</div>
                  <div className="bg-muted rounded p-3 text-sm space-y-2">
                    <div>
                      <span className="font-medium">Puntuación de riesgo:</span>{' '}
                      {plan.analysis.riskScore}/5
                    </div>
                    {plan.analysis.keyFeatures && (
                      <div>
                        <span className="font-medium">Características principales:</span>
                        <ul className="list-disc list-inside mt-1">
                          {plan.analysis.keyFeatures.map((feature: string, i: number) => (
                            <li key={i}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compartir propuesta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleWhatsAppShare} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Compartir por WhatsApp
            </Button>
            
            <Button variant="outline" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copiado
                </>
              ) : (
                'Copiar enlace'
              )}
            </Button>
          </div>
          
          <Button variant="outline" className="w-full" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF (próximamente)
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        Esta propuesta fue generada con datos disponibles al momento de la consulta.
        Los precios y coberturas están sujetos a confirmación con la aseguradora.
      </div>
    </div>
  );
}