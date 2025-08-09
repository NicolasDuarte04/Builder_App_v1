export function parseCopMoney(input: string): number | null {
  if (!input) return null;
  const s = String(input).trim();
  // Remove currency symbols and spaces
  let cleaned = s
    .replace(/COP|\$|USD|COL\$|COLPESOS/gi, '')
    .replace(/[^0-9.,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  // Handle common formats:
  // 176.499.000  |  176,499,000  |  176 499 000  |  176.499.000,00  |  176,499,000.00
  // Strategy:
  // - If both separators present, assume last occurrence indicates decimal, drop decimals for COP
  // - Else treat either comma or dot as thousands and strip them

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  // Normalize spaces as thousands separators
  cleaned = cleaned.replace(/\s+/g, '');

  if (hasComma && hasDot) {
    // Keep only digits and separators, then drop everything after the last separator as decimals
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const lastSep = Math.max(lastComma, lastDot);
    const integerPart = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
    const intVal = Number(integerPart);
    return Number.isFinite(intVal) ? intVal : null;
  }

  // Only one type of separator or none
  const normalized = cleaned.replace(/[.,]/g, '');
  const val = Number(normalized);
  return Number.isFinite(val) ? val : null;
}


