import type { AllowedCountry, AllowedProduct, AllowedCurrency } from './allowlists';

type PriceCapKey = `${AllowedProduct}:${AllowedCountry}:${AllowedCurrency}`;

// Reasonable upper bounds for monthly premiums per product/country/currency
export const MonthlyPremiumCaps: Record<PriceCapKey, number> = {
  // MX caps (MXN)
  'auto:MX:MXN': 10000,
  'travel:MX:MXN': 3000,
  'health:MX:MXN': 20000,
  'home:MX:MXN': 8000,
  'life:MX:MXN': 15000,
  'pet:MX:MXN': 3000,
  'dental:MX:MXN': 3000,

  // CO caps (COP)
  'auto:CO:COP': 1200000,
  'travel:CO:COP': 1200000,
  'health:CO:COP': 8000000,
  'home:CO:COP': 3000000,
  'life:CO:COP': 6000000,
  'pet:CO:COP': 1200000,
  'dental:CO:COP': 1200000,
};

export function getMonthlyCap(product: AllowedProduct, country: AllowedCountry, currency: AllowedCurrency): number | null {
  const key = `${product}:${country}:${currency}` as PriceCapKey;
  return MonthlyPremiumCaps[key] ?? null;
}

