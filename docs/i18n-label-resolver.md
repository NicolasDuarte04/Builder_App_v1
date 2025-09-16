# i18n Label Resolver Documentation

## Overview

The label resolver system provides robust, localized label resolution for fields and enums with comprehensive normalization and fallback handling.

## Resolver Decision Table

### Field Labels

| Input | Normalized | Priority 1 | Priority 2 | Priority 3 (Fallback) | Output |
|-------|------------|------------|------------|-----------------------|---------|
| `"price"` | `"price"` | `labels.fields.price` | `labels.price` | `"Price"` | Translation or "Price" |
| `"waiting_times"` | `"waiting_times"` | `labels.fields.waiting_times` | `labels.waiting_times` | `"Waiting Times"` | Translation or "Waiting Times" |
| `"WaitingTimes"` | `"waiting_times"` | `labels.fields.waiting_times` | `labels.waiting_times` | `"Waiting Times"` | Translation or "Waiting Times" |
| `"labels.fields.price"` | `"price"` | `labels.fields.price` | `labels.price` | `"Price"` | Translation or "Price" |
| `"unknown-field"` | `"unknown_field"` | Not found | Not found | `"Unknown Field"` | "Unknown Field" |

### Enum Labels

| Kind | Value | Normalized Value | Priority 1 | Priority 2 | Priority 3 (Fallback) | Output |
|------|-------|------------------|------------|------------|-----------------------|---------|
| `"coverage_types"` | `"muerte"` | `"muerte"` | `labels.enums.coverage_types.muerte` | `labels.muerte` | `"Muerte"` | "Fallecimiento" (ES) / "Death coverage" (EN) |
| `"CoverageTypes"` | `"invalidez"` | `"invalidez"` | `labels.enums.coverage_types.invalidez` | `labels.invalidez` | `"Invalidez"` | "Invalidez" (ES) / "Disability" (EN) |
| `"coverage_types"` | `"CoverageTypes.muerte"` | `"muerte"` | `labels.enums.coverage_types.muerte` | `labels.muerte` | `"Muerte"` | "Fallecimiento" (ES) / "Death coverage" (EN) |
| `"sources"` | `"pdf"` | `"pdf"` | `labels.enums.sources.pdf` | `labels.pdf` | `"Pdf"` | "PDF" |
| `"coverage_types"` | `"labels.enums.coverage_types.invalidez"` | `"invalidez"` | `labels.enums.coverage_types.invalidez` | `labels.invalidez` | `"Invalidez"` | "Invalidez" (ES) / "Disability" (EN) |
| `"coverage_types"` | `"unknown_coverage"` | `"unknown_coverage"` | Not found | Not found | `"Unknown Coverage"` | "Unknown Coverage" |

## All Enum Values in Repository

### Coverage Types
- `muerte` → "Fallecimiento" (ES) / "Death coverage" (EN)
- `invalidez` → "Invalidez" (ES) / "Disability" (EN)
- `invalidez_total` → "Invalidez total" (ES) / "Total disability" (EN)
- `invalidez_parcial` → "Invalidez parcial" (ES) / "Partial disability" (EN)
- `enfermedades_graves` → "Enfermedades graves" (ES) / "Critical illness" (EN)
- `renta_diaria` → "Renta diaria" (ES) / "Daily income" (EN)
- `auxilio_funerario` → "Auxilio funerario" (ES) / "Funeral assistance" (EN)
- `asistencia` → "Asistencia" (ES) / "Assistance" (EN)
- `robo` → "Robo" (ES) / "Theft" (EN)
- `vidrios` → "Vidrios" (ES) / "Glass" (EN)
- `consulta_medica` → "Consulta médica" (ES) / "Medical consultation" (EN)
- `hospitalizacion` → "Hospitalización" (ES) / "Hospitalization" (EN)
- `medicamentos` → "Medicamentos" (ES) / "Medications" (EN)
- `urgencias` → "Urgencias" (ES) / "Emergency care" (EN)

### Sources
- `catalog` → "Catálogo" (ES) / "Catalog" (EN)
- `template` → "Plantilla" (ES) / "Template" (EN)
- `pdf` → "PDF"
- `url` → "Sitio web" (ES) / "Website" (EN)
- `text` → "Texto" (ES) / "Text" (EN)

### Categories
- `health` / `salud` → "Salud" (ES) / "Health" (EN)
- `life` / `vida` → "Vida" (ES) / "Life" (EN)
- `auto` → "Auto"
- `home` / `hogar` → "Hogar" (ES) / "Home" (EN)
- `travel` / `viaje` → "Viaje" (ES) / "Travel" (EN)
- `business` / `empresarial` → "Empresarial" (ES) / "Business" (EN)

## SSR/CSR Consistency Guarantees

1. **Deterministic Output**: All normalization is deterministic and produces the same result regardless of environment
2. **Primitive Returns**: Always returns primitive strings, never functions or objects
3. **Error Handling**: Translation errors are caught and fallback to Title Case
4. **No Side Effects**: Pure functions with no external state modifications

## Test Coverage

### Unit Tests (`src/lib/i18n/__tests__/labels.test.ts`)
- Normalization of various input formats
- Priority hierarchy validation
- Edge case handling (null, undefined, numbers)
- Prefix stripping for all formats
- SSR/CSR consistency checks
- Translation error resilience

### E2E Tests (`tests/e2e/label-rendering.test.ts`)
- No dotted keys visible in UI
- Correct enum label rendering in comparison view
- Graceful handling of missing translations
- Language switching consistency

## Acceptance Criteria Met

✅ **No dotted keys visible**: Resolver always returns human-readable labels or translations
✅ **Robust normalization**: Handles mixed inputs (dotted, camelCase, prefixed) 
✅ **Hydration clean**: Returns only primitive strings, deterministic output
✅ **Tests green**: Comprehensive unit and e2e test coverage
✅ **All call sites audited**: Fixed direct `t()` calls that should use resolver

## Usage Examples

```typescript
// In a component
const { fieldLabel, enumLabel } = makeLabelResolver(t);

// Field labels
fieldLabel('price') // → "Precio" or "Price"
fieldLabel('waiting_times') // → "Tiempos de espera" or "Waiting Times"

// Enum labels
enumLabel('coverage_types', 'muerte') // → "Fallecimiento" or "Death coverage"
enumLabel('sources', 'pdf') // → "PDF"

// Handles legacy formats automatically
enumLabel('CoverageTypes', 'CoverageTypes.muerte') // → "Fallecimiento" or "Death coverage"
enumLabel('coverage_types', 'labels.enums.coverage_types.invalidez') // → "Invalidez" or "Disability"
```
