"use client";
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
};

type Props = {
  onResults: (rows: Plan[]) => void;
};

export default function SmartIntakeForm({ onResults }: Props) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const body = {
      category_code: String(fd.get('category')),
      budget_high: Number(fd.get('budget_high')),
      must_haves: String(fd.get('must_haves') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setLoading(true);
    const res = await fetch('/api/copilot/search', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body) 
    });
    const data = await res.json();
    onResults(data || []);
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-1">
        <Label htmlFor="category">Categoría</Label>
        <Select name="category" defaultValue="auto">
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Vehículos</SelectItem>
            <SelectItem value="health">Salud</SelectItem>
            <SelectItem value="life">Vida</SelectItem>
            <SelectItem value="travel">Viajes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="sm:col-span-1">
        <Label htmlFor="budget_high">Presupuesto (máx)</Label>
        <Input id="budget_high" name="budget_high" type="number" placeholder="300000" />
      </div>
      
      <div className="sm:col-span-3">
        <Label htmlFor="must_haves">Imprescindibles (separados por coma)</Label>
        <Input id="must_haves" name="must_haves" placeholder="asistencia, vidrios, cancelación" />
      </div>
      
      <div className="sm:col-span-3">
        <Button type="submit" disabled={loading}>{loading ? 'Buscando…' : 'Encontrar Top 3'}</Button>
      </div>
    </form>
  );
}