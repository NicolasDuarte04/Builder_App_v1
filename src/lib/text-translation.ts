// Lightweight client-side text translation helper
// Goal: Provide a best-effort EN rendering for Spanish plan content without backend changes.

type Language = 'es' | 'en';

// Common insurance vocabulary seen across our datasets (Spanish -> English)
const DICTIONARY: Array<[RegExp, string]> = [
  // Common function words and connectors
  [/\bde\b/gi, 'of'],
  [/\bdel\b/gi, 'of the'],
  [/\bal\b/gi, 'to the'],
  [/\ben\b/gi, 'in'],
  [/\bcon\b/gi, 'with'],
  [/\bsin\b/gi, 'without'],
  [/\bpara\b/gi, 'for'],
  [/\bpor\b/gi, 'for'],
  [/\bcuando\b/gi, 'when'],
  [/\bque\b/gi, 'that'],
  [/\by\b/gi, 'and'],
  [/\bo\b/gi, 'or'],
  [/\bpero\b/gi, 'but'],
  [/\bcomo\b/gi, 'like'],
  [/\btu\b/gi, 'your'],
  [/\bsu\b/gi, 'your'],
  [/\btus\b/gi, 'your'],
  [/\bsus\b/gi, 'their'],
  [/\bla\b/gi, 'the'],
  [/\bel\b/gi, 'the'],
  [/\blos\b/gi, 'the'],
  [/\blas\b/gi, 'the'],
  [/\bun\b/gi, 'a'],
  [/\buna\b/gi, 'a'],
  [/\bunos\b/gi, 'some'],
  [/\bunas\b/gi, 'some'],
  [/\ba\b/gi, 'to'],
  [/\bdesde\b/gi, 'from'],
  [/\bhasta\b/gi, 'up to'],
  [/seguro(s)?/gi, 'insurance$1'],
  [/plan(es)?/gi, 'plan$1'],
  [/beneficio(s)?/gi, 'benefit$1'],
  [/característica(s)?/gi, 'feature$1'],
  [/cobertura(s)?/gi, 'coverage$1'],
  [/coberturas/gi, 'coverages'],
  [/deducible(s)?/gi, 'deductible$1'],
  [/prima(s)?/gi, 'premium$1'],
  [/mensual(es)?/gi, 'monthly$1'],
  [/anual(es)?/gi, 'annual$1'],
  [/garantizado/gi, 'guaranteed'],
  [/garantizada/gi, 'guaranteed'],
  [/hasta/gi, 'up to'],
  [/desde/gi, 'from'],
  [/incluye/gi, 'includes'],
  [/incluyen/gi, 'include'],
  [/excluye/gi, 'excludes'],
  [/hospitalización/gi, 'hospitalization'],
  [/hospitalaria/gi, 'hospital'],
  [/educación/gi, 'education'],
  [/educativo/gi, 'education'],
  [/salud/gi, 'health'],
  [/vida/gi, 'life'],
  [/accidente(s)?/gi, 'accident$1'],
  [/familiar/gi, 'family'],
  [/universidad/gi, 'university'],
  [/universitario/gi, 'university'],
  [/global/gi, 'global'],
  [/pago/gi, 'payment'],
  [/pagos/gi, 'payments'],
  [/reembolso(s)?/gi, 'reimbursement$1'],
  [/valor asegurado/gi, 'insured amount'],
  [/valor/gi, 'amount'],
  [/asegurado/gi, 'insured'],
  [/protección/gi, 'protection'],
  [/proteger|protege/gi, 'protect'],
  [/sonrisa/gi, 'smile'],
  [/familia/gi, 'family'],
  [/bienestar/gi, 'wellbeing'],
  [/atención médica/gi, 'medical care'],
  [/atención/gi, 'care'],
  [/médica/gi, 'medical'],
  [/independencia económica/gi, 'financial independence'],
  [/enfermedad/gi, 'illness'],
  [/variación del ipc/gi, 'CPI variation'],
  [/ajuste por variación del ipc/gi, 'adjustment due to CPI variation'],
  [/vigencia/gi, 'term'],
  [/cobertura básica/gi, 'basic coverage'],
  [/adicional/gi, 'additional'],
  [/seguro de vida/gi, 'life insurance'],
  [/odontol[óo]gic[oa]/gi, 'dental'],
  [/salud/gi, 'health'],
  [/cáncer/gi, 'cancer'],
  [/deportes/gi, 'sports'],
  [/viaje/gi, 'travel'],
  [/hogar/gi, 'home'],
  [/auto/gi, 'auto'],
  [/responsabilidad civil/gi, 'liability'],
  [/odontología/gi, 'dental'],
  [/maternidad/gi, 'maternity'],
  [/terremoto/gi, 'earthquake'],
  [/incendio/gi, 'fire'],
  [/robo/gi, 'theft'],
  [/muerte/gi, 'death'],
  [/invalidez/gi, 'disability'],
  [/asistencia/gi, 'assistance'],
  [/emergencia(s)?/gi, 'emergency$1'],
  [/co\-pago(s)?|copago(s)?/gi, 'copay$1'],
  [/preexistencia(s)?/gi, 'pre-existing condition$1'],
  [/semestre(s)?/gi, 'semester$1'],
  [/colegio/gi, 'school'],
  [/matrícula/gi, 'tuition'],
  [/momento/gi, 'moment'],
  [/recibe/gi, 'receive'],
  [/podr[aá]s/gi, 'you can'],
  [/que buscas/gi, 'you seek'],
  [/de inmediato/gi, 'immediately'],
  [/doctor(es)?/gi, 'doctor$1'],
  [/médico(s)?/gi, 'medical$1'],
  [/red/gi, 'network'],
];

const cache = new Map<string, string>();

export function translateIfEnglish(text: string | undefined | null, language: Language): string {
  if (!text) return '';
  if (language !== 'en') return text;
  const key = `en::${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let result = text;
  for (const [pattern, replacement] of DICTIONARY) {
    result = result.replace(pattern, replacement);
  }

  // Basic cleanup: collapse extra spaces
  result = result.replace(/\s{2,}/g, ' ').trim();

  cache.set(key, result);
  return result;
}

export function translateListIfEnglish(list: Array<string> | undefined | null, language: Language): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => translateIfEnglish(item, language));
}

// Convenience helpers for categories and small badges
export function translateCategoryIfEnglish(category: string | undefined | null, language: Language): string {
  if (!category) return '';
  if (language !== 'en') return category;
  const normalized = category.toLowerCase();
  const map: Record<string, string> = {
    educacion: 'education',
    educación: 'education',
    salud: 'health',
    vida: 'life',
    viaje: 'travel',
    auto: 'auto',
    hogar: 'home',
  } as any;
  return map[normalized] || translateIfEnglish(category, 'en');
}


