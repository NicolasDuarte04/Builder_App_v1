import { Currency, Country } from './schema';

export type RejectReason = {
  reason: string;
  code?: string;
};

export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function hasAtMostTwoDecimals(value: number): boolean {
  return Number.isInteger(Math.round(value * 100));
}

export function parseMaybeNumber(input: unknown): number | null {
  if (typeof input === 'number' && isFinite(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    // Normalize common money formats e.g. "COP 1.234.567,89" or "1,234.56"
    // Heuristic: remove currency symbols and spaces, then
    // - if both '.' and ',' exist: assume last one is decimal separator
    // - else keep '.' as decimal
    const cleaned = trimmed.replace(/[^0-9.,-]/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned;
    if (lastComma !== -1 && lastDot !== -1) {
      // Use the rightmost as decimal separator, remove the other
      if (lastComma > lastDot) {
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = cleaned.replace(/,/g, '');
      }
    } else if (lastComma !== -1 && lastDot === -1) {
      // Only commas → treat as decimal comma if there is exactly one comma
      const commaCount = (cleaned.match(/,/g) || []).length;
      if (commaCount === 1 && cleaned.length - lastComma - 1 <= 2) {
        normalized = cleaned.replace(',', '.');
      } else {
        normalized = cleaned.replace(/,/g, '');
      }
    } else if (lastDot !== -1) {
      // Only dots → already good
      normalized = cleaned;
    }
    const num = Number(normalized);
    return isFinite(num) ? num : null;
  }
  return null;
}

export function convertToMonthly(amount: number, period?: string | null): number {
  const p = String(period || 'month').toLowerCase();
  if (p.startsWith('year')) return amount / 12;
  if (p.startsWith('day')) return amount * 30;
  return amount; // assume monthly
}

export function enforceCountryCurrency(
  country: Country,
  inputCurrency: string | undefined,
  explicitUSDJustification: boolean
): { currency: Currency; coerced: boolean; reason?: string; usdJustified: boolean } {
  const declared = String(inputCurrency || '').toUpperCase() as Currency | '';
  if (declared === 'USD') {
    // Only accept USD if explicitly justified; otherwise coerce to country currency
    if (!explicitUSDJustification) {
      if (country === 'CO') return { currency: 'COP', coerced: true, reason: 'Coerced USD→COP (unjustified) for CO', usdJustified: false };
      if (country === 'MX') return { currency: 'MXN', coerced: true, reason: 'Coerced USD→MXN (unjustified) for MX', usdJustified: false };
    }
    return { currency: 'USD', coerced: false, usdJustified: true };
  }
  if (country === 'CO') {
    if (declared && declared !== 'COP') {
      return { currency: 'COP', coerced: true, reason: `Coerced ${declared}→COP for CO`, usdJustified: false };
    }
    return { currency: 'COP', coerced: false, usdJustified: false };
  }
  if (country === 'MX') {
    if (declared && declared !== 'MXN') {
      return { currency: 'MXN', coerced: true, reason: `Coerced ${declared}→MXN for MX`, usdJustified: false };
    }
    return { currency: 'MXN', coerced: false, usdJustified: false };
  }
  // Fallback (should not happen due to schema)
  return { currency: 'USD', coerced: false, usdJustified: false };
}

export function enforcePriceRanges(
  country: Country,
  basePrice: number
): { ok: boolean; reason?: string } {
  if (country === 'CO') {
    if (basePrice < 10 || basePrice > 50_000_000) {
      return { ok: false, reason: `Price ${basePrice} out of range for CO [10, 50000000]` };
    }
  } else if (country === 'MX') {
    if (basePrice < 10 || basePrice > 1_000_000) {
      return { ok: false, reason: `Price ${basePrice} out of range for MX [10, 1000000]` };
    }
  }
  return { ok: true };
}

export function isLikelyPdf(url: string): boolean {
  try {
    const u = new URL(url);
    if (/\.pdf(\?|$)/i.test(u.pathname)) return true;
    if (/brochure|folleto|condiciones|pdf|policy|poliza/i.test(u.pathname)) return true;
    return false;
  } catch {
    return /\.pdf(\?|$)/i.test(url);
  }
}

export function classifyAndAssignLinks(
  candidates: Array<string | undefined>
): { external_link?: string; brochure_link?: string; rejectReason?: string; warnings: string[] } {
  const warnings: string[] = [];
  const urls = candidates.filter((u): u is string => !!u && /^https?:\/\//i.test(u));
  let product: string | undefined;
  let brochure: string | undefined;
  for (const u of urls) {
    if (isLikelyPdf(u)) {
      if (!brochure) brochure = u;
    } else {
      if (!product) product = u;
    }
  }
  if (!product && brochure) {
    warnings.push('PDF detected without product page');
    return { brochure_link: brochure, rejectReason: 'Missing product page (external_link)', warnings };
  }
  if (!product) {
    return { rejectReason: 'No valid external link' , warnings };
  }
  return { external_link: product, brochure_link: brochure, warnings };
}

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export function cleanBenefitLine(line: string): string {
  let s = stripHtml(line || '');
  s = s.replace(/^[\s•*\-–—]+/g, ''); // leading bullets/glyphs
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/[;,.!?]+$/g, '.'); // normalize trailing punctuation
  s = s.replace(/[.]{2,}$/g, '.'); // collapse duplicate
  return s.trim();
}

export function dedupNormalized(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const key = l.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(l);
    }
  }
  return out;
}

export function cleanBenefits(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const cleaned = arr
    .map((s) => cleanBenefitLine(String(s)))
    .filter((s) => s.length > 0);
  const deduped = dedupNormalized(cleaned);
  return deduped;
}

export function ensureBenefitCount(benefits: string[]): string[] {
  if (benefits.length <= 12) return benefits;
  // Keep most informative lines by length descending
  const sorted = [...benefits].sort((a, b) => b.length - a.length);
  return sorted.slice(0, 12);
}

export function explicitUSDMarkerFromFields(fields: Record<string, unknown>): boolean {
  const textFields: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') textFields.push(v);
  }
  const joined = textFields.join(' ').toLowerCase();
  return /\busd\b|us\$|dolares|dólares/.test(joined);
}


