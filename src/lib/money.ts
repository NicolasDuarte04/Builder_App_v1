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


// Parse Latin-formatted numbers with '.' and ',' as decimal/thousands separators.
// Rules:
// - Trims spaces; rejects non [0-9.,]
// - If both '.' and ',' present: last separator is decimal when 1–2 digits follow it; strip the other as thousands
// - If only one separator:
//   - If pattern ^\d{1,3}[.,]\d{1,2}$ → treat as decimal
//   - Else → treat as thousands (remove the separator)
// - Returns a float
export function parseLatinNumber(input: string): number | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Remove spaces inside the number
  const s = raw.replace(/\s+/g, '');

  // Reject invalid characters
  if (/[^0-9.,]/.test(s)) return null;

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  // Helper to safely parse with a desired decimal separator
  const parseWithDecimal = (numStr: string, decimalSep: '.' | ','): number | null => {
    const normalized = decimalSep === ',' ? numStr.replace(/\./g, '').replace(',', '.') : numStr.replace(/,/g, '');
    const val = Number(normalized);
    return Number.isFinite(val) ? val : null;
  };

  if (hasDot && hasComma) {
    // Decide decimal by last separator only when it has 1–2 digits after it
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const lastIdx = Math.max(lastDot, lastComma);
    const sep = s[lastIdx];
    const fractional = s.slice(lastIdx + 1);
    if (/^\d{1,2}$/.test(fractional)) {
      // Keep last as decimal, strip the other
      if (sep === ',') {
        // Remove all dots (thousands), keep comma as decimal
        return parseWithDecimal(s.replace(/\./g, ''), ',');
      } else {
        // sep === '.' → remove commas (thousands), keep dot as decimal
        return parseWithDecimal(s.replace(/,/g, ''), '.');
      }
    }
    // Otherwise treat all as thousands
    const onlyDigits = s.replace(/[.,]/g, '');
    const val = Number(onlyDigits);
    return Number.isFinite(val) ? val : null;
  }

  if (hasDot || hasComma) {
    // Single separator present
    if (/^\d{1,3}[.,]\d{1,2}$/.test(s)) {
      // Looks like a decimal
      const sep = s.includes(',') ? ',' : '.';
      return parseWithDecimal(s, sep as ',' | '.');
    }
    // Otherwise treat as thousands separator(s) → strip it/them
    const onlyDigits = s.replace(/[.,]/g, '');
    const val = Number(onlyDigits);
    return Number.isFinite(val) ? val : null;
  }

  // No separators, just digits
  const val = Number(s);
  return Number.isFinite(val) ? val : null;
}


