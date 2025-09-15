const clean = (s: string) =>
  String(s || '').normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().trim();

export const COVERAGES_MAP: Record<string, string> = {
  // vidrios family
  vidrios: 'vidrios', cristales: 'vidrios', parabrisas: 'vidrios',
  // asistencia family
  asistencia: 'asistencia', 'asistencia 24/7': 'asistencia', 'auxilio mecanico': 'asistencia', grua: 'asistencia',
  // robo family
  robo: 'robo', 'robo total': 'robo', hurto: 'robo',
};

export function normalizeCoverage(term: string): string {
  const k = clean(term);
  return COVERAGES_MAP[k] || k; // fallback to cleaned token
}

export function normalizeCoverageList(list?: string[] | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of list || []) {
    const n = normalizeCoverage(t);
    if (n && !seen.has(n)) { seen.add(n); out.push(n); } // stable order
  }
  return out;
}
