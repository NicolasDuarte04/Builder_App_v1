import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function PlanCard({
  plan,
  onAnalyze,
  onAdd,
}: {
  plan: any;
  onAnalyze: () => void;
  onAdd: () => void;
}) {
  const price = plan?.plan_pricing?.[0];
  const benefits = (plan?.plan_benefits || []).slice(0, 6);
  
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
              <Button variant="outline" size="sm" onClick={onAnalyze}>Analizar póliza</Button>
              <Button size="sm" onClick={onAdd}>Añadir a propuesta</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
