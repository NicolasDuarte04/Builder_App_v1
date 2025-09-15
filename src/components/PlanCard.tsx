import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight } from 'lucide-react';
import { useCompareStore } from '@/state/compareStore';
import { fromCatalog } from '@/lib/comparison/adapters';
import { telemetry, getUserContext } from '@/lib/telemetry';
import { Brief } from '@/types/brief';

export function PlanCard({
  plan,
  onAnalyze,
  onAdd,
  brief,
}: {
  plan: any;
  onAnalyze: () => void;
  onAdd: () => void;
  brief?: Brief;
}) {
  const price = plan?.plan_pricing?.[0];
  const benefits = (plan?.plan_benefits || []).slice(0, 6);
  const compareCount = useCompareStore(s => s.count);
  const isInComparison = useCompareStore(s => s.isInCompare(plan.id));
  const isComparisonFull = useCompareStore(s => s.isFull);
  const add = useCompareStore(s => s.add);
  
  

  const handleCompare = () => {
    if (!isInComparison && !isComparisonFull) {
      const comparedPlan = fromCatalog(plan, brief);
      add(comparedPlan);
    }
  };
  
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-base font-medium">
              {plan.name_es} <span className="text-muted-foreground">({plan.insurers?.name})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {benefits.map((b: any) => <Badge key={b.key} variant="secondary">{b.key}</Badge>)}
            </div>
            <a href={plan.source_url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-muted-foreground">Fuente</a>
            <div className="text-[11px] text-muted-foreground">
              {plan.last_verified_at ? 'Última actualización ✓' : 'Última actualización —'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium">
              {price?.premium_min
                ? `$${price.premium_min} – $${price.premium_max} ${price.currency}`
                : 'Precio a consultar'}
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCompare}
                disabled={!isInComparison && isComparisonFull}
                className="flex-shrink-0 px-2 gap-1"
                aria-label={isInComparison ? "En comparación" : "Comparar"}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="text-xs">{compareCount}/3</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onAnalyze}>Analizar póliza</Button>
              <Button size="sm" onClick={onAdd}>Añadir a propuesta</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
