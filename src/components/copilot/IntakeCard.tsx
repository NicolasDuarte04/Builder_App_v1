'use client';
import { FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface IntakeCardProps {
  onSubmit: (brief: any) => void;
  loading: boolean;
  collapsed: boolean;
  onExpand: () => void;
}

export function IntakeCard({ onSubmit, loading, collapsed, onExpand }: IntakeCardProps) {
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const brief = {
      category_code: String(fd.get('category')),
      budget_high: Number(fd.get('budget_high')),
      must_haves: String(fd.get('must_haves') || '').split(',').map(s => s.trim()).filter(Boolean),
    };
    onSubmit(brief);
  }

  if (collapsed) {
    return (
      <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={onExpand}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Brief del cliente</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Brief del cliente</CardTitle>
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
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

            <div>
              <Label htmlFor="budget_high">Presupuesto (máx)</Label>
              <Input 
                id="budget_high" 
                name="budget_high" 
                type="number" 
                placeholder="300000" 
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="must_haves">Imprescindibles (separados por coma)</Label>
            <Input 
              id="must_haves" 
              name="must_haves" 
              placeholder="asistencia, vidrios, cancelación" 
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Buscando...' : 'Encontrar Top 3'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
