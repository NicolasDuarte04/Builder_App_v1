import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X, Minus } from 'lucide-react';

interface CompareTableProps {
  plans: any[];
}

export function CompareTable({ plans }: CompareTableProps) {
  if (plans.length < 2) return null;

  // Extract common comparison points
  const comparePoints = [
    { key: 'price', label: 'Precio mensual' },
    { key: 'deductible', label: 'Deducible general' },
    { key: 'glass', label: 'Cobertura vidrios' },
    { key: 'assistance', label: 'Asistencia vial' },
    { key: 'international', label: 'Cobertura internacional' },
    { key: 'replacement', label: 'Vehículo reemplazo' },
  ];

  const formatPrice = (plan: any) => {
    const price = plan.plan_pricing?.[0];
    if (!price?.premium_min) return 'A consultar';
    return `$${price.premium_min.toLocaleString()} - $${price.premium_max.toLocaleString()}`;
  };

  const getFeatureValue = (plan: any, key: string) => {
    // Check if feature exists in benefits
    const benefit = plan.plan_benefits?.find((b: any) => 
      b.key.toLowerCase().includes(key.toLowerCase())
    );
    
    if (benefit) {
      return { exists: true, value: benefit.value_es || '✓' };
    }
    
    // Special handling for price
    if (key === 'price') {
      return { exists: true, value: formatPrice(plan) };
    }
    
    // Check analysis if available
    if (plan.analysis) {
      if (key === 'deductible' && plan.analysis.coverage?.deductibles?.general) {
        return { 
          exists: true, 
          value: `$${plan.analysis.coverage.deductibles.general.toLocaleString()}` 
        };
      }
    }
    
    return { exists: false, value: null };
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Característica</TableHead>
            {plans.map((plan) => (
              <TableHead key={plan.id} className="text-center">
                <div className="space-y-1">
                  <div className="font-medium">{plan.name_es}</div>
                  <div className="text-xs text-muted-foreground">
                    {plan.insurers?.name}
                  </div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparePoints.map((point) => (
            <TableRow key={point.key}>
              <TableCell className="font-medium">{point.label}</TableCell>
              {plans.map((plan) => {
                const feature = getFeatureValue(plan, point.key);
                return (
                  <TableCell key={plan.id} className="text-center">
                    {feature.exists ? (
                      <div className="flex items-center justify-center gap-2">
                        {point.key === 'price' ? (
                          <span className="text-sm font-medium">{feature.value}</span>
                        ) : typeof feature.value === 'string' && feature.value.startsWith('$') ? (
                          <span className="text-sm">{feature.value}</span>
                        ) : (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            {feature.value !== '✓' && (
                              <span className="text-xs">{feature.value}</span>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          
          {/* Score Row */}
          <TableRow>
            <TableCell className="font-medium">Puntuación general</TableCell>
            {plans.map((plan) => (
              <TableCell key={plan.id} className="text-center">
                <Badge variant={plan.score >= 0.7 ? 'default' : 'secondary'}>
                  {Math.round((plan.score || 0.5) * 100)}%
                </Badge>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p>• Los precios mostrados son aproximados y pueden variar según el perfil del asegurado</p>
        <p>• Consulta con tu asesor para confirmar coberturas específicas</p>
      </div>
    </div>
  );
}
