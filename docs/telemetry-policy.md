### Política de Telemetría (PII-safe) – Briki

Objetivo: asegurar que los eventos no incluyan PII y reducir el ruido de eventos de alto volumen mediante muestreo (sampling) del 10–20%.

#### Sanitización (sin PII)
- **Se excluye texto libre**: `brief`, `briefText`, `notes`, `note`, `comment`, `comments`, `description`, `text`, `rawText`, `raw`, `body`, `content`, `input`, `query`, `prompt`.
- **Se excluyen campos de error/diagnóstico**: `message`, `error`, `cause`, `exception`, `stack`, `stacktrace`, `stack_trace`, `trace`, `filename`, `file_name`, `filepath`, `file_path`, `path`.
- **Se enmascaran patrones dentro de strings**: emails → `[redacted_email]`, teléfonos → `[redacted_phone]`.
- Se aplica recursivamente a objetos/arreglos; si algo falla, se descarta el payload.

La implementación vive en `src/lib/telemetry.sanitize.ts` como `sanitizeTelemetryPayload(payload)` y se ejecuta antes de emitir.

#### Sampling (eventos de alto volumen)
- Introducimos `trackSampled(event, payload, { rate })` con `rate` en 0.1–0.2 recomendado.
- En desarrollo y con banderas E2E, los eventos se envían siempre (sin sampling) para facilitar pruebas.

Ejemplos de eventos candidatos a sampling (recomendado 10–20%):
- **UI**: `ui_layout_changed`
- **Resultados**: `results_injected`, `results_drawn`
- **Comparador**: `comparator_item_added`, `comparator_item_removed`

#### Uso
```ts
import { telemetry } from '@/lib/telemetry';

// 20% de muestreo
telemetry.trackSampled(telemetry.events.UI_LAYOUT_CHANGED, { collapsed: true, reason: 'manual' }, { rate: 0.2 });

// 10% de muestreo (por defecto)
telemetry.trackSampled(telemetry.events.RESULTS_DRAWN, { displayedCount: 24 });
```

Notas:
- No incluir PII en los payloads de origen. El sanitizador es una defensa adicional, no la única.
- Mantener los payloads minimalistas: usar contadores, flags y hashes cortos en lugar de textos libres.

