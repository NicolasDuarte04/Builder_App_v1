import { describe, it, expect } from 'vitest';
import { normalizePriceToCOP, CURRENCY_RATES } from '../../src/lib/currency-normalization';

describe('currency normalization → COP/month', () => {
  it('converts USD monthly → COP monthly with rate telemetry-friendly output', () => {
    const result = normalizePriceToCOP(10, 'USD', 'monthly');
    expect(result).not.toBeNull();
    expect(result!.amountCOPMonthly).toBe(Math.round(10 * CURRENCY_RATES.USD_TO_COP));
    expect(result!.originalCurrency).toBe('USD');
    expect(result!.originalPeriod).toBe('monthly');
    expect(result!.assumptions.join(' ')).toMatch(/Converted from USD/);
    expect(typeof result!.rate === 'number' || result!.rate === undefined).toBe(true);
  });

  it('converts USD yearly → COP monthly (factor 1/12)', () => {
    const result = normalizePriceToCOP(120, 'USD', 'yearly');
    const expected = Math.round(120 * CURRENCY_RATES.USD_TO_COP * (1/12));
    expect(result!.amountCOPMonthly).toBe(expected);
    expect(result!.assumptions.join(' ')).toMatch(/to monthly/);
  });

  it('unknown currency assumes COP passthrough', () => {
    const result = normalizePriceToCOP(50000, 'XYZ', 'monthly');
    expect(result!.amountCOPMonthly).toBe(50000);
    expect(result!.assumptions.join(' ')).toMatch(/Unknown currency XYZ/);
  });

  it('handles spanish period labels (mensual, anual)', () => {
    const r1 = normalizePriceToCOP(100, 'USD', 'mensual');
    const r2 = normalizePriceToCOP(120, 'USD', 'anual');
    expect(r1!.assumptions.join(' ')).not.toMatch(/to monthly/);
    expect(r2!.assumptions.join(' ')).toMatch(/to monthly/);
  });
});


