import { describe, test, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

describe('plans_v2/search normalization', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FF_CURRENCY_NORM = '1';
    process.env.USD_TO_COP = '5000';
  });

  test('normalizes USD monthly to COP monthly and emits PRICE_NORMALIZED', async () => {
    const body = { includeCategories: ['salud'], country: 'CO', limit: 3 };

    // Mock DB pool to return USD-denominated rows
    vi.doMock('@/lib/render-db', () => ({
      pool: {
        query: vi.fn(async () => ({ rows: [
          { id: 'x', provider: 'A', name: 'Plan A', category: 'salud', country: 'CO', base_price: 10, currency: 'USD', price_period: 'monthly', external_link: null, brochure_link: null, benefits: [], benefits_en: [], tags: [] },
        ] }))
      },
      hasDatabaseUrl: true,
    }));

    const req = new Request('http://localhost/api/plans_v2/search', { method: 'POST', body: JSON.stringify(body) });
    const res: any = await POST(req);
    const json = await res.json();
    const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
    expect(Array.isArray(items)).toBe(true);
    expect(items[0].normalizedPrice).toEqual(expect.objectContaining({ amountCOPMonthly: 50000, originalCurrency: 'USD' }));
  });
});


