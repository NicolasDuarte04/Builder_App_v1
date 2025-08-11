export const DOMAIN_MAP: Record<string, string[]> = {
  'Seguros SURA': ['sura.com', 'segurossura.com.co'],
  'Mapfre': ['mapfre.com.co'],
  'Seguros Bolívar': ['segurosbolivar.com', 'www.segurosbolivar.com'],
  'Seguros del Estado': ['segurosdelestado.com'],
  'AXA Colpatria': ['axa-colpatria.co', 'axa.co'],
  'Liberty Seguros': ['libertycolombia.com.co', 'libertyseguros.co'],
  'Allianz': ['allianz.co'],
  'HDI Seguros': ['hdi.com.co'],
  'Chubb': ['chubb.com', 'chubb.com/co-es'],
  'Colmena Seguros': ['colmena.com.co'],
  'Colsanitas': ['colsanitas.com'],
  'BMI Cos': ['bmicos.com.co', 'www.bmicos.com.co', 'bmicos.com', 'www.bmicos.com']
};

export function isOnAllowedDomain(provider: string | null | undefined, url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!provider) return true;
    const allowed = DOMAIN_MAP[provider];
    if (!allowed) return true;
    return allowed.some(d => host === d || host.endsWith(`.${d.toLowerCase()}`));
  } catch {
    return false;
  }
}



