import { validateAndNormalizeBrief } from '@/lib/validate/brief';
import { normalizeCoverageList } from '@/lib/coveragesMap';
import { presetsFor } from '@/lib/coverage-presets';
import { computeFitScore } from '@/lib/fitScore';
import type { Brief } from '@/types/brief';

export interface TemplatePlan {
  id: string;
  title: string;
  summary: string;
  suggestedCoverages: string[]; // canonical tokens
  typicalExclusions: string[];
  priceRangeCop: { min: number; max: number };
  disclaimers: string[];
  redFlags: string[];
  fitScore: number; // 0–100
  source?: { kind: 'template'; updatedAt?: string };
}

const CLAMP_MIN = 10_000;
const CLAMP_MAX = 10_000_000;

function clampBudget(value: number): number {
  if (!Number.isFinite(value)) return CLAMP_MIN;
  return Math.min(CLAMP_MAX, Math.max(CLAMP_MIN, Math.round(value)));
}

function computeBands(center?: number | null): Array<{ label: string; factorMin: number; factorMax: number }> {
  // Deterministic 3 tiers around budget center; if no center, use baseline mid bands
  // Factors chosen to create non-overlapping ranges with small asymmetry
  return [
    { label: 'Esencial', factorMin: 0.75, factorMax: 0.90 },
    { label: 'Equilibrado', factorMin: 0.90, factorMax: 1.15 },
    { label: 'Amplio', factorMin: 1.15, factorMax: 1.35 },
  ];
}

function categoryExclusions(category: string | undefined): string[] {
  const base = ['gastos no asistenciales', 'daños intencionales', 'riesgos excluidos póliza base'];
  const cat = (category || '').toLowerCase();
  if (cat.includes('veh')) return base.concat(['competencias o pruebas de velocidad']);
  if (cat.includes('salud')) return base.concat(['preexistencias no declaradas', 'cirugías estéticas']);
  if (cat.includes('viaj')) return base.concat(['eventos conocidos antes del viaje']);
  if (cat.includes('vida')) return base.concat(['suicidio dentro de periodo de carencia']);
  if (cat.includes('hogar')) return base.concat(['daños por falta de mantenimiento']);
  if (cat.includes('pyme') || cat.includes('empres')) return base.concat(['actos ilícitos de directivos no cubiertos']);
  return base;
}

function categoryDisclaimers(category: string | undefined): string[] {
  const common = [
    'Resumen informativo, no reemplaza condiciones de póliza.',
    'Coberturas y límites sujetos a aseguradora y suscripción.',
  ];
  const cat = (category || '').toLowerCase();
  if (cat.includes('salud')) return common.concat(['Aplican periodos de carencia y preexistencias.']);
  if (cat.includes('veh')) return common.concat(['Deductibles y depreciación pueden aplicar según cobertura.']);
  if (cat.includes('hogar')) return common.concat(['Siniestros por mantenimiento deficiente suelen estar excluidos.']);
  if (cat.includes('viaj')) return common.concat(['Coberturas válidas solo durante el viaje y en vigencia.']);
  if (cat.includes('vida')) return common.concat(['Beneficiarios deben estar correctamente designados.']);
  return common;
}

function buildId(parts: string[]): string {
  // Deterministic id without randomness
  const base = parts.join('|');
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `tpl_${hash.toString(16)}`;
}

function unionNormalized(a: string[], b: string[]): string[] {
  return normalizeCoverageList([...a, ...b]);
}

function computeFitScoreTemplate(brief: Partial<Brief>, template: TemplatePlan): number {
  // Use shared computeFitScore function
  const planLike = {
    priceRangeCop: template.priceRangeCop,
    suggestedCoverages: template.suggestedCoverages
  };
  
  return computeFitScore(brief, planLike);
}

export function buildSmartTemplates(briefInput: Brief | null): TemplatePlan[] {
  const { brief } = validateAndNormalizeBrief(briefInput || {} as any);
  const category = brief.category || undefined;
  const must = normalizeCoverageList(brief.mustHaveCoverages || []);
  const presetList = normalizeCoverageList(presetsFor(category));

  // suggested = union of must-haves + top presets for category (limit to reasonable size)
  const suggestedBase = unionNormalized(must, presetList).slice(0, 12);

  const exclusions = categoryExclusions(category);
  const disclaimers = categoryDisclaimers(category);

  // Price bands
  const center = typeof brief.maxBudgetCop === 'number' ? clampBudget(brief.maxBudgetCop) : undefined;
  const bands = computeBands(center);

  // Build 3 templates minimal; we can extend to up to 6 by adding variants
  const templatesCore: TemplatePlan[] = bands.map((b, idx) => {
    const label = b.label;
    const baseTitle = category ? `${label} ${category}` : `${label} Plan`;

    const basePrice = center || 200_000; // deterministic default
    const min = clampBudget(basePrice * b.factorMin);
    const max = clampBudget(basePrice * b.factorMax);

    // coverage depth by tier
    const tierBoost = idx === 0 ? 0 : idx === 1 ? 2 : 4;
    const coverages = suggestedBase.slice(0, Math.min(suggestedBase.length, 6 + tierBoost));

    const summary = `Opción ${label.toLowerCase()} con coberturas ${idx === 0 ? 'esenciales' : idx === 1 ? 'equilibradas' : 'ampliadas'} para ${category || 'tu necesidad'}.`;

    const redFlags: string[] = [];
    if (typeof center === 'number' && must.length > 0) {
      const minPresetAnchor = Math.max(CLAMP_MIN, Math.round((presetList.length > 0 ? 180_000 : 120_000)));
      if (center < minPresetAnchor * 0.75) {
        redFlags.push('Presupuesto muy bajo para coberturas solicitadas');
      }
    }

    const tpl: TemplatePlan = {
      id: buildId([baseTitle, String(min), String(max), ...coverages]),
      title: baseTitle,
      summary,
      suggestedCoverages: coverages,
      typicalExclusions: exclusions,
      priceRangeCop: { min, max },
      disclaimers,
      redFlags,
      fitScore: 0, // set later
      source: { kind: 'template', updatedAt: new Date().toISOString() },
    };
    return tpl;
  });

  // Optionally add variants if must-haves are heavy to reach 4-6 templates deterministically
  let variants: TemplatePlan[] = [];
  if (suggestedBase.length > 8) {
    const alt1 = {
      ...templatesCore[1],
      id: buildId([templatesCore[1].id, 'alt1']),
      title: `${templatesCore[1].title} Plus`,
      suggestedCoverages: normalizeCoverageList([...suggestedBase.slice(0, 9)]),
    } as TemplatePlan;
    variants.push(alt1);
  }
  if (suggestedBase.length > 10) {
    const alt2 = {
      ...templatesCore[2],
      id: buildId([templatesCore[2].id, 'alt2']),
      title: `${templatesCore[2].title} Max`,
      suggestedCoverages: normalizeCoverageList([...suggestedBase.slice(0, 12)]),
    } as TemplatePlan;
    variants.push(alt2);
  }

  const all = [...templatesCore, ...variants].slice(0, 6);

  // Fit scores
  const scored = all.map(t => ({ ...t, fitScore: computeFitScoreTemplate(brief as Brief, t) }));

  // Deterministic final order: by descending fitScore, tie-break by id
  scored.sort((a, b) => (b.fitScore - a.fitScore) || a.id.localeCompare(b.id));

  return scored.slice(0, Math.max(3, Math.min(6, scored.length)));
}
