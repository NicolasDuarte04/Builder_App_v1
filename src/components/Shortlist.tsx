"use client";
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanCard } from '@/components/PlanCard';

type PlanPricing = { premium_min?: number; premium_max?: number; currency?: string };
type PlanBenefit = { key: string };
export type Plan = {
  id: string;
  name_es?: string;
  source_url?: string;
  insurers?: { name?: string } | null;
  last_verified_at?: string | null;
  plan_pricing?: PlanPricing[];
  plan_benefits?: PlanBenefit[];
  analysis?: unknown;
};

type Props = {
  rows: Plan[];
  onAnalyze?: (plan: Plan) => void;
  onCreateProposal?: (selected: Plan[]) => void;
};

export default function Shortlist({ rows, onAnalyze, onCreateProposal }: Props) {
  const [selected, setSelected] = useState<Plan[]>([]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-medium">Recomendados</h2>
      {rows.map((p) => (
        <PlanCard
          key={p.id}
          plan={p}
          onAnalyze={() => onAnalyze?.(p)}
          onAdd={() => setSelected((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))}
        />
      ))}
      {selected.length > 0 && (
        <div className="sticky bottom-4">
          <Card>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{selected.length} plan(es) en propuesta</div>
              <Button onClick={() => onCreateProposal?.(selected)}>Generar propuesta</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}