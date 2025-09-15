'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Link, FileText, Loader2 } from 'lucide-react';
import { useSourcingToolkit } from '@/hooks/useSourcingToolkit';
import { telemetry, getUserContext, getSafeFileMetadata } from '@/lib/telemetry';
import { useProposal } from '@/state/proposal';
import type { NormalizedPlan } from '@/types/results';

interface SourcingActionsProps {
  onResultAdded?: (plan: NormalizedPlan, fitScore: number) => void;
}

export function SourcingActions({ onResultAdded }: SourcingActionsProps) {
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { normalizePdf, normalizeUrl, normalizeText } = useSourcingToolkit();
  const setShortlist = useProposal((s) => s.setShortlist);
  const shortlist = useProposal((s) => s.shortlist);

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Track action
    const userContext = await getUserContext();
    telemetry.track(telemetry.events.SOURCING_ACTION_CLICKED, { 
      kind: 'pdf',
      file: getSafeFileMetadata(file),
      ...userContext
    });

    setLoading('pdf');
    
    try {
      // First upload the file to get an uploadId
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload PDF');
      }

      const uploadResult = await uploadResponse.json();
      const uploadId = uploadResult.uploadId || uploadResult.id;

      if (!uploadId) {
        throw new Error('No upload ID returned');
      }

      // Now normalize the PDF
      const { plan, fitScore } = await normalizePdf(uploadId);
      
      // Add to results
      if (onResultAdded) {
        onResultAdded(plan, fitScore);
      } else {
        // Fallback: add to shortlist if no custom handler
        const newPlan = {
          id: `sourced-${Date.now()}`,
          name_es: plan.name || 'Plan desde PDF',
          provider: plan.provider || 'Proveedor desconocido',
          priceCop: plan.priceCop,
          benefits: plan.benefits,
          exclusions: plan.exclusions,
          fitScore,
          source: plan.source,
          category: 'sourced'
        };
        setShortlist([...shortlist, newPlan]);
      }

    } catch (error) {
      console.error('Error processing PDF:', error);
      // Error telemetry is handled in the hook
    } finally {
      setLoading(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    setLoading('url');
    
    try {
      const { plan, fitScore } = await normalizeUrl(url);
      
      // Add to results
      if (onResultAdded) {
        onResultAdded(plan, fitScore);
      } else {
        // Fallback: add to shortlist if no custom handler
        const newPlan = {
          id: `sourced-${Date.now()}`,
          name_es: plan.name || 'Plan desde URL',
          provider: plan.provider || 'Proveedor desconocido',
          priceCop: plan.priceCop,
          benefits: plan.benefits,
          exclusions: plan.exclusions,
          fitScore,
          source: plan.source,
          category: 'sourced'
        };
        setShortlist([...shortlist, newPlan]);
      }

      setUrl('');
      setUrlModalOpen(false);

    } catch (error) {
      console.error('Error processing URL:', error);
      // Error telemetry is handled in the hook
    } finally {
      setLoading(null);
    }
  };

  const handleTextSubmit = async () => {
    if (!text.trim()) return;

    setLoading('text');
    
    try {
      const { plan, fitScore } = await normalizeText(text);
      
      // Add to results
      if (onResultAdded) {
        onResultAdded(plan, fitScore);
      } else {
        // Fallback: add to shortlist if no custom handler
        const newPlan = {
          id: `sourced-${Date.now()}`,
          name_es: plan.name || 'Plan desde texto',
          provider: plan.provider || 'Proveedor desconocido',
          priceCop: plan.priceCop,
          benefits: plan.benefits,
          exclusions: plan.exclusions,
          fitScore,
          source: plan.source,
          category: 'sourced'
        };
        setShortlist([...shortlist, newPlan]);
      }

      setText('');
      setTextModalOpen(false);

    } catch (error) {
      console.error('Error processing text:', error);
      // Error telemetry is handled in the hook
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* PDF Upload Button */}
        <Button
          variant="outline"
          className="flex-1 h-auto p-4 flex flex-col items-center gap-2 text-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading === 'pdf'}
        >
          {loading === 'pdf' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          <span className="font-medium">Comparar PDF de competidor</span>
          <span className="text-xs text-muted-foreground text-center">
            Sube un PDF de póliza para análisis automático
          </span>
        </Button>

        {/* URL Input Button */}
        <Button
          variant="outline"
          className="flex-1 h-auto p-4 flex flex-col items-center gap-2 text-sm"
          onClick={() => setUrlModalOpen(true)}
          disabled={loading === 'url'}
        >
          {loading === 'url' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Link className="h-5 w-5" />
          )}
          <span className="font-medium">Normalizar página de aseguradora (URL)</span>
          <span className="text-xs text-muted-foreground text-center">
            Extrae información de una página web de seguros
          </span>
        </Button>

        {/* Text Input Button */}
        <Button
          variant="outline"
          className="flex-1 h-auto p-4 flex flex-col items-center gap-2 text-sm"
          onClick={() => setTextModalOpen(true)}
          disabled={loading === 'text'}
        >
          {loading === 'text' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          <span className="font-medium">Pegar texto</span>
          <span className="text-xs text-muted-foreground text-center">
            Analiza información copiada de documentos o emails
          </span>
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handlePdfUpload}
        className="hidden"
      />

      {/* URL Modal */}
      <Dialog open={urlModalOpen} onOpenChange={setUrlModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Normalizar página de aseguradora</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL de la página</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://ejemplo.com/seguro-auto"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUrlModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleUrlSubmit} 
                disabled={!url.trim() || loading === 'url'}
              >
                {loading === 'url' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Analizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Modal */}
      <Dialog open={textModalOpen} onOpenChange={setTextModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Analizar texto de póliza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Texto de la póliza</Label>
              <Textarea
                id="text"
                placeholder="Pega aquí la información de la póliza (coberturas, exclusiones, precios, etc.)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTextModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleTextSubmit} 
                disabled={!text.trim() || loading === 'text'}
              >
                {loading === 'text' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Analizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
