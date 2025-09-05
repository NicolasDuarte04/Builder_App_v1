import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSearch, Plus, Check, ExternalLink, Calendar } from 'lucide-react';

export function PlanResultCard({ 
  plan, 
  onAnalyze, 
  onToggle, 
  selected,
  compact = false 
}: {
  plan: any; 
  onAnalyze: () => void; 
  onToggle: () => void; 
  selected: boolean;
  compact?: boolean;
}) {
  const price = plan?.plan_pricing?.[0];
  const benefits = (plan?.plan_benefits ?? []).slice(0, compact ? 4 : 6);
  
  return (
    <Card className={`group hover:shadow-sm transition ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className={`${compact ? 'text-sm' : 'text-base'} font-medium truncate`}>
              {plan.name_es} 
              <span className="text-muted-foreground ml-1">({plan.insurers?.name})</span>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-1.5">
              {benefits.map((b: any) => (
                <Badge key={b.key} variant="secondary" className={compact ? 'text-xs px-2 py-0.5' : ''}>
                  {b.key}
                </Badge>
              ))}
              {plan.plan_benefits?.length > benefits.length && (
                <Badge variant="outline" className={compact ? 'text-xs px-2 py-0.5' : ''}>
                  +{plan.plan_benefits.length - benefits.length}
                </Badge>
              )}
            </div>
            
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {plan.source_url && (
                <>
                  <a 
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors" 
                    href={plan.source_url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Fuente
                  </a>
                  <span>•</span>
                </>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {plan.last_verified_at 
                  ? new Date(plan.last_verified_at).toLocaleDateString('es', { month: 'short', year: 'numeric' })
                  : 'Sin verificar'}
              </span>
              {plan.analysis && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    Analizado
                  </Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <div className={`${compact ? 'text-sm' : 'text-base'} font-medium`}>
              {price?.premium_min 
                ? `$${price.premium_min.toLocaleString()}–$${price.premium_max.toLocaleString()}`
                : 'Precio a consultar'}
            </div>
            {price?.currency && (
              <div className="text-xs text-muted-foreground">
                {price.currency} / {price.billing_period || 'mes'}
              </div>
            )}
            
            <div className={`${compact ? 'mt-2' : 'mt-3'} flex gap-2 justify-end`}>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
                className={compact ? 'h-7 px-2 text-xs' : ''}
              >
                <FileSearch className={compact ? 'h-3 w-3' : 'h-4 w-4 mr-1'} />
                {!compact && 'Analizar'}
              </Button>
              
              <Button 
                size="sm" 
                variant={selected ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className={compact ? 'h-7 px-2 text-xs' : ''}
              >
                {selected ? (
                  <Check className={compact ? 'h-3 w-3' : 'h-4 w-4 mr-1'} />
                ) : (
                  <Plus className={compact ? 'h-3 w-3' : 'h-4 w-4 mr-1'} />
                )}
                {!compact && (selected ? 'Añadido' : 'Añadir')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
