export type BriefCategory = 'vehiculos' | 'salud' | 'hogar' | 'viajes' | 'vida' | 'pyme';

export const COVERAGE_PRESETS: Record<BriefCategory, string[]> = {
  vehiculos: ['asistencia', 'robo', 'daños propios', 'responsabilidad civil', 'vidrios', 'incendio'],
  salud:     ['consultas', 'hospitalización', 'medicamentos', 'maternidad', 'odontología', 'preexistencias'],
  hogar:     ['incendio', 'robo', 'inundación', 'terremoto', 'responsabilidad civil'],
  viajes:    ['asistencia médica', 'evacuación', 'equipaje', 'cancelación', 'repatriación', 'demoras'],
  vida:      ['muerte', 'invalidez', 'enfermedades graves', 'renta diaria', 'auxilio funerario'],
  pyme:      ['RC', 'lucro cesante', 'rotura de maquinaria', 'incendio', 'robo', 'ciber'],
};

export function presetsFor(category?: string) {
  const key = (category || '').toLowerCase() as BriefCategory;
  return COVERAGE_PRESETS[key] ?? COVERAGE_PRESETS.vehiculos;
}
