import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(v?: number|null, currency='COP', locale='es-CO') {
  if (v == null || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat(locale, { style:'currency', currency, maximumFractionDigits:0 }).format(v);
}

// Consistent localized date for trust metadata lines
export function formatTrustDate(input?: string | Date | null, locale?: string): string {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  try {
    // Use compact, readable format per locale
    const loc = locale && typeof locale === 'string' ? locale : undefined;
    return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
