// Lightweight currency and period normalization helper for COP/month
// Extracted from plans_v2 search route for unit testing and reuse.

export const CURRENCY_RATES = {
  USD_TO_COP: Number(process.env.USD_TO_COP || '4200'),
  EUR_TO_COP: Number(process.env.EUR_TO_COP || '4600'),
  MXN_TO_COP: Number(process.env.MXN_TO_COP || '250'),
};

export const PERIOD_TO_MONTHLY = {
  daily: 30,
  weekly: 4.33,
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  annual: 1 / 12,
  yearly: 1 / 12,
} as const;

export interface NormalizedPrice {
  amountCOPMonthly: number;
  originalAmount: number;
  originalCurrency: string;
  originalPeriod?: string;
  assumptions: string[];
  rate?: number;
}

export function normalizePriceToCOP(
  amount: number | null | undefined,
  currency: string | null | undefined,
  period?: string | null
): NormalizedPrice | null {
  if (!amount || amount === 0) return null;

  const assumptions: string[] = [];
  const originalAmount = amount;
  const originalCurrency = currency || 'COP';
  const originalPeriod = period || 'monthly';

  let workingCurrency = (currency || 'COP').toUpperCase();
  let workingAmount = amount;
  let usedRate: number | undefined;

  if (workingCurrency !== 'COP') {
    const rateKey = `${workingCurrency}_TO_COP` as keyof typeof CURRENCY_RATES;
    const rate = CURRENCY_RATES[rateKey];
    if (rate) {
      workingAmount = amount * rate;
      usedRate = rate;
      assumptions.push(`Converted from ${workingCurrency} using rate ${rate}`);
    } else {
      assumptions.push(`Unknown currency ${workingCurrency}, assumed as COP`);
      workingCurrency = 'COP';
    }
  }

  let normalizedPeriod = (period || 'monthly').toLowerCase();
  if (normalizedPeriod === 'mensual' || normalizedPeriod === 'mes') {
    normalizedPeriod = 'monthly';
  } else if (normalizedPeriod === 'anual' || normalizedPeriod === 'año' || normalizedPeriod === 'year') {
    normalizedPeriod = 'annual';
  } else if (normalizedPeriod === 'trimestral' || normalizedPeriod === 'trimester') {
    normalizedPeriod = 'quarterly';
  }

  const periodFactor = (PERIOD_TO_MONTHLY as any)[normalizedPeriod];
  if (periodFactor && periodFactor !== 1) {
    workingAmount = workingAmount * periodFactor;
    assumptions.push(`Converted from ${normalizedPeriod} to monthly (factor: ${periodFactor})`);
  } else if (!periodFactor) {
    assumptions.push(`Unknown period "${period}", assumed monthly`);
  }

  const amountCOPMonthly = Math.round(workingAmount);
  return {
    amountCOPMonthly,
    originalAmount,
    originalCurrency,
    originalPeriod,
    assumptions,
    rate: usedRate,
  };
}


