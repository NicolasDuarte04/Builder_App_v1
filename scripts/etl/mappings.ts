import { PlanCategory } from './schema';

export const CATEGORY_MAP: Record<string, PlanCategory> = {
  salud: 'salud',
  health: 'salud',
  medicina: 'salud',
  medical: 'salud',
  odontologico: 'dental',
  dental: 'dental',
  soat: 'soat',
  hogar: 'hogar',
  home: 'hogar',
  auto: 'auto',
  car: 'auto',
  viaje: 'viaje',
  travel: 'viaje',
  educativa: 'educativa',
  education: 'educativa',
  mascotas: 'mascotas',
  pets: 'mascotas',
  vida: 'vida',
  // Common extras from dataset
  empresarial: 'otros',
  tecnologia: 'otros',
  educacion: 'educativa',
  dispositivos: 'otros',
};

function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}+/gu, '');
}

export function normalizeCategory(input: string): PlanCategory {
  const key = stripAccents(String(input || ''))
    .trim()
    .toLowerCase();
  const mapped = CATEGORY_MAP[key as keyof typeof CATEGORY_MAP];
  if (!mapped) {
    console.warn(`[category] Unmapped category "${input}" → using 'otros'`);
    return 'otros';
  }
  return mapped;
}

// Remove legal form clutter but preserve the brand token "Seguros"
const CLUTTER_PHRASES: RegExp[] = [
  /\bgrupo\s+financiero\b/gi,
  /\bcompa[nñ]ia\s+de\s+seguros\b/gi, // we will replace with 'Seguros'
];
const CLUTTER_TOKENS: RegExp[] = [
  /\bs\.?a\.?\s*(de\s*c\.?v\.?)?\b/gi,
  /\bs\.?a\.?s\.?\b/gi,
  /\bs\.r\.l\.?\b/gi,
  /\bltda\.?\b/gi,
  /\bltd\.?\b/gi,
  /\binc\.?\b/gi,
  /\bcorp\.?\b/gi,
  /\bco\.?\b/gi,
];

const LOWERCASE_EXCEPTIONS = new Set(['axa', 'sura', 'mapfre', 'bupa', 'eps', 'isapre']);
const SMALL_WORDS = new Set(['de', 'del', 'la', 'y', 'en', 'el', 'los', 'las']);

export function normalizeProvider(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  // Replace known phrases first
  let cleaned = raw;
  for (const rx of CLUTTER_PHRASES) {
    cleaned = cleaned.replace(rx, 'Seguros');
  }
  // Remove tokens
  for (const rx of CLUTTER_TOKENS) {
    cleaned = cleaned.replace(rx, '');
  }
  // Collapse spaces
  const noClutter = cleaned.replace(/\s{2,}/g, ' ').trim();
  // Title case with small-word exceptions and brand uppercases
  const words = noClutter.split(/\s+/);
  const titled = words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (LOWERCASE_EXCEPTIONS.has(lower)) return w.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .trim();
  // Ensure the word "Seguros" remains if it's meaningful
  return titled.length ? titled : raw;
}

export function inferTags(name: string, benefits: string[]): string[] {
  const text = `${name} ${benefits.join(' ')}`.toLowerCase();
  const tags: string[] = [];
  const add = (t: string) => {
    if (!tags.includes(t)) tags.push(t);
  };
  if (/schengen/.test(text)) add('schengen');
  if (/odont|dental/.test(text)) add('odontologia');
  if (/internacional|international/.test(text)) add('internacional');
  if (/familiar|family/.test(text)) add('familiar');
  if (/(covid|covid-19)/.test(text)) add('covid');
  if (/mascotas|pets?/.test(text)) add('mascotas');
  if (/soat/.test(text)) add('soat');
  if (/auto|car/.test(text)) add('auto');
  if (/hogar|home/.test(text)) add('hogar');
  if (/viaje|travel/.test(text)) add('viaje');
  return tags;
}


