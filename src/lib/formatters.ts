import type { Currency } from '@/types/plan';

export function formatPrice(amount?: number | null, currency?: Currency | null) {
  if (!amount || amount <= 0 || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function localizedName(name: string, name_en?: string | null, isEN?: boolean) {
  if (isEN) return name_en || name;
  return name;
}

export function localizedBenefits(benefits?: string[], benefits_en?: string[], isEN?: boolean) {
  if (!benefits) return [] as string[];
  if (isEN) return (benefits_en && benefits_en.length ? benefits_en : benefits);
  return benefits;
}


