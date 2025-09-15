'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface BriefDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (brief: any) => void;
  defaultValues?: any;
}

export function BriefDrawer({ open, onOpenChange, onSubmit, defaultValues }: BriefDrawerProps) {
  const { t, language } = useTranslation();
  const [formData, setFormData] = useState({
    category_code: defaultValues?.category_code || 'auto',
    budget_high: defaultValues?.budget_high || '',
    must_haves: defaultValues?.must_haves?.join(', ') || '',
  });

  useEffect(() => {
    if (defaultValues) {
      setFormData({
        category_code: defaultValues.category_code || 'auto',
        budget_high: defaultValues.budget_high || '',
        must_haves: defaultValues.must_haves?.join(', ') || '',
      });
    }
  }, [defaultValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brief = {
      category_code: formData.category_code,
      budget_high: Number(formData.budget_high),
      must_haves: formData.must_haves
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
    };
    onSubmit(brief);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-xl">
        <Card className="h-full rounded-none border-0 flex flex-col">
          <CardHeader className="flex-shrink-0 flex flex-row items-start justify-between">
            <div>
              <CardTitle>Brief del cliente</CardTitle>
              <CardDescription>
                Ingresa los detalles del seguro que busca tu cliente
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label={t('brief.actions.discard') as any}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-grow overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría de seguro</Label>
                <Select
                  value={formData.category_code}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_code: value }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Vehículos</SelectItem>
                    <SelectItem value="health">Salud</SelectItem>
                    <SelectItem value="life">Vida</SelectItem>
                    <SelectItem value="travel">Viajes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Presupuesto máximo (COP)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="300000"
                  value={formData.budget_high}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_high: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Valor mensual máximo que el cliente está dispuesto a pagar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="must_haves">Coberturas imprescindibles</Label>
                <Input
                  id="must_haves"
                  placeholder="asistencia, vidrios, robo"
                  value={formData.must_haves}
                  onChange={(e) => setFormData(prev => ({ ...prev, must_haves: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Separa cada cobertura con comas
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <Button type="submit" className="w-full">
                  Buscar mejores opciones
                </Button>
                
                {defaultValues && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Sugerencias rápidas:
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            budget_high: String(Number(prev.budget_high) * 1.5),
                          }));
                        }}
                      >
                        +50% presupuesto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const mustHaves = formData.must_haves.split(',').map((s: string) => s.trim()).filter(Boolean);
                          setFormData(prev => ({
                            ...prev,
                            must_haves: mustHaves.slice(0, -1).join(', '),
                          }));
                        }}
                      >
                        -1 requisito
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
