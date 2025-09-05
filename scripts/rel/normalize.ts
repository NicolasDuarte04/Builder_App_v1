export function normalizeCarrier(name: string): string {
  const lower = (name || '').toLowerCase().trim();
  const map: Record<string,string> = {
    'axa colpatria s.a.': 'AXA Colpatria',
    'axa colpatria': 'AXA Colpatria',
    'axa co': 'AXA Colpatria',
    'zurich seguros colombia': 'Zurich',
    'zurich': 'Zurich',
    'seguros sura': 'Seguros SURA',
    'sura': 'Seguros SURA',
    'allianz colombia': 'Allianz',
    'allianz': 'Allianz',
    'seguros bolivar': 'Seguros Bolívar',
    'seguros bolívar': 'Seguros Bolívar',
    'hdi seguros colombia': 'HDI Seguros',
    'hdi seguros': 'HDI Seguros',
    'sbs seguros': 'SBS Seguros',
  };
  return map[lower] || (name || '').trim();
}


