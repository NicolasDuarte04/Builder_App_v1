# Sourcing Toolkit

Sistema unificado para normalizar planes de seguros desde diferentes fuentes (PDF, URL, texto).

## Archivos

- `src/hooks/useSourcingToolkit.ts` - Hook principal con funciones de normalización
- `src/components/sourcing/SourcingActions.tsx` - Componente UI con botones de acción

## Uso

### Hook `useSourcingToolkit`

```tsx
import { useSourcingToolkit } from '@/hooks/useSourcingToolkit';

function MyComponent() {
  const { normalizePdf, normalizeUrl, normalizeText } = useSourcingToolkit();

  const handlePdf = async (uploadId: string) => {
    const { plan, fitScore } = await normalizePdf(uploadId);
    console.log('Normalized plan:', plan);
    console.log('Fit score:', fitScore);
  };

  const handleUrl = async (url: string) => {
    const { plan, fitScore } = await normalizeUrl(url);
    // Procesar resultado...
  };

  const handleText = async (text: string) => {
    const { plan, fitScore } = await normalizeText(text);
    // Procesar resultado...
  };
}
```

### Componente `SourcingActions`

```tsx
import { SourcingActions } from '@/components/sourcing/SourcingActions';

function MyPage() {
  const handleResultAdded = (plan: NormalizedPlan, fitScore: number) => {
    console.log('New plan added:', plan, fitScore);
    // Agregar al store de resultados, mostrar en UI, etc.
  };

  return (
    <div>
      <h2>Agregar planes de la competencia</h2>
      <SourcingActions onResultAdded={handleResultAdded} />
    </div>
  );
}
```

## Funcionalidades

### 1. Normalización de PDF (`normalizePdf`)
- Llama a `/api/ai/analyze-policy?uploadId=...`
- Mapea el resultado del analizador a `NormalizedPlan`
- Canonicaliza benefits/exclusions usando `normalizeCoverageList`
- Calcula `fitScore` usando `computeFitScore`

### 2. Normalización de URL (`normalizeUrl`)
- Llama a `POST /api/normalize-url`
- Extrae información de páginas web de aseguradoras
- Mapea resultado a `NormalizedPlan`

### 3. Normalización de texto (`normalizeText`)
- Parsing local sin llamadas de red
- Usa heurísticas para extraer:
  - Proveedor (patrones de nombres de aseguradoras)
  - Precio (patrones de montos en COP)
  - Benefits (palabras clave de coberturas)
  - Exclusions (palabras clave de exclusiones)

## Telemetría

Todos los eventos incluyen telemetría automática:

- `SOURCING_ACTION_CLICKED` - Al hacer clic en cualquier acción
- `SOURCE_NORMALIZED_SUCCESS` - Cuando la normalización es exitosa
- `SOURCE_NORMALIZED_FAIL` - Cuando falla la normalización
- `FIT_SCORE_COMPUTED` - Cuando se calcula el fit score

## Integración con stores

El componente `SourcingActions` se integra automáticamente con:

- `useProposal` - Para agregar planes al shortlist
- Callback personalizado `onResultAdded` - Para manejo custom

## Tipo `NormalizedPlan`

```typescript
type NormalizedPlan = {
  provider?: string;
  name?: string;
  priceCop?: number | null;
  benefits: string[]; // tokens canónicos
  exclusions?: string[];
  source: { kind: 'pdf' | 'url' | 'text'; ref: string };
};
```

El `fitScore` es un número 0-100 que indica qué tan bien el plan normalizado coincide con el brief actual del usuario.
