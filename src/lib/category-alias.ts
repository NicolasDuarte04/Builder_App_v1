// Centralized category aliasing and normalization

export type CanonicalCategory =
  | 'auto'
  | 'salud'
  | 'vida'
  | 'hogar'
  | 'viaje'
  | 'empresarial'
  | 'mascotas'
  | 'educacion'
  | 'otros';

const SYNONYM_TO_CANONICAL: Record<string, CanonicalCategory> = {
  auto: 'auto', car: 'auto', carro: 'auto', vehiculo: 'auto',
  salud: 'salud', health: 'salud', medico: 'salud', medicina: 'salud',
  vida: 'vida', life: 'vida',
  hogar: 'hogar', home: 'hogar', casa: 'hogar',
  viaje: 'viaje', travel: 'viaje',
  empresarial: 'empresarial', empresa: 'empresarial', negocio: 'empresarial', otros: 'otros', other: 'otros', others: 'otros',
  mascotas: 'mascotas', pet: 'mascotas', pets: 'mascotas',
  educacion: 'educacion', educativa: 'educacion', educativo: 'educacion', estudios: 'educacion', universidad: 'educacion', colegio: 'educacion',
  education: 'educacion', tuition: 'educacion', school: 'educacion', university: 'educacion', college: 'educacion',
};

// Map canonical to stored category in DB
const CANONICAL_TO_STORED: Record<CanonicalCategory, string> = {
  auto: 'auto',
  salud: 'salud',
  vida: 'vida',
  hogar: 'hogar',
  viaje: 'viaje',
  empresarial: 'otros',
  mascotas: 'mascotas',
  // Our DB stores education as 'educativa'
  educacion: 'educativa',
  otros: 'otros',
};

export function toCanonicalInputCategory(input?: string | null): CanonicalCategory | undefined {
  if (!input) return undefined;
  const key = String(input).normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().trim();
  return SYNONYM_TO_CANONICAL[key];
}

export function toStoredCategory(input?: string | null): string | undefined {
  if (!input) return undefined;
  const canon = toCanonicalInputCategory(input as string) || (input as string as CanonicalCategory);
  const stored = CANONICAL_TO_STORED[canon as CanonicalCategory];
  return stored || input || undefined;
}

export function normalizeIncludeExclude(categories?: string[] | null): string[] {
  if (!Array.isArray(categories)) return [];
  const mapped = categories
    .map((c) => toStoredCategory(c))
    .filter((c): c is string => !!c);
  return Array.from(new Set(mapped));
}


