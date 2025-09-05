'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProposal } from '@/state/proposal';
import { Check, ExternalLink, FileSearch } from 'lucide-react';

interface ShortlistPanelProps {
  plans: any[];
  selectedIds: string[];
  onAnalyze: (plan: any) => void;
}

export function ShortlistPanel({ plans, selectedIds, onAnalyze }: ShortlistPanelProps) {
  const { toggleSelect } = useProposal();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Top 3 Recomendados</h2>
      
      {plans.map((plan) => {
        const isSelected = selectedIds.includes(plan.id);
        const price = plan.plan_pricing?.[0];
        
        return (
          <Card 
            key={plan.id} 
            className={isSelected ? 'ring-2 ring-primary' : ''}
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-grow space-y-2">
                  <div className="font-medium">
                    {plan.name_es}
                    <span className="text-muted-foreground ml-2">({plan.insurers?.name})</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(plan.plan_benefits || []).slice(0, 5).map((b: any) => (
                      <Badge key={b.key} variant="secondary" className="text-xs">
                        {b.key}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <a 
                      href={plan.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Fuente
                    </a>
                    <span>
                      {plan.last_verified_at 
                        ? `Actualizado ${new Date(plan.last_verified_at).toLocaleDateString()}`
                        : 'Sin fecha de actualización'}
                    </span>
                  </div>
                </div>
                
                <div className="text-right space-y-3">
                  <div className="text-sm font-medium">
                    {price?.premium_min
                      ? `$${price.premium_min} - $${price.premium_max}`
                      : 'Precio a consultar'}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAnalyze(plan)}
                    >
                      <FileSearch className="h-4 w-4 mr-1" />
                      Analizar
                    </Button>
                    
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleSelect(plan)}
                    >
                      {isSelected && <Check className="h-4 w-4 mr-1" />}
                      {isSelected ? 'Añadido' : 'Añadir'}
                    </Button>
                  </div>
                </div>
              </div>
              
              {plan.analysis && (
                <div className="mt-3 pt-3 border-t">
                  <Badge variant="outline" className="text-xs">
                    Análisis adjunto
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
