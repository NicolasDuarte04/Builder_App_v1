const carrierSynonyms: Record<string, string> = {
  'axa colpatria s.a.': 'AXA Colpatria',
  'axa colpatria': 'AXA Colpatria',
  'axa': 'AXA',
  'seguros sura': 'Seguros SURA',
  'sura': 'Seguros SURA',
  'seguros bolivar': 'Seguros Bolívar',
  'seguros bolívar': 'Seguros Bolívar',
  'allianz colombia': 'Allianz',
  'allianz': 'Allianz',
  'zurich seguros colombia': 'Zurich',
  'zurich': 'Zurich',
  'hdi seguros colombia': 'HDI Seguros',
  'hdi seguros': 'HDI Seguros',
  'sbs seguros': 'SBS Seguros',
};

function clean(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

export function normalizeCarrier(name: string): string {
  if (!name) return name;
  const key = clean(name);
  return carrierSynonyms[key] || name.trim();
}


