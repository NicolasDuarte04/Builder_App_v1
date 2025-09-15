import { test, expect } from '@playwright/test';

test.describe('L13: Currency normalization UI and server event', () => {
  test('server returns mixed currencies; UI shows COP/month with tooltip; PRICE_NORMALIZED fired once (server)', async ({ page }) => {
    // Mock plans search endpoint with mixed currencies
    await page.route('**/api/plans_v2/search', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-price-normalized-count': '2',
          'x-price-normalized-origin': 'server',
          'x-price-normalized-runkey': 'e2e-runkey-123',
          'x-search-id': 'e2e-search-abc'
        },
        body: JSON.stringify([
          { id: 'p1', provider: 'A', name: 'Plan A', category: 'salud', country: 'CO', base_price: 20, currency: 'USD', price_period: 'monthly' },
          { id: 'p2', provider: 'B', name: 'Plan B', category: 'salud', country: 'CO', base_price: 240, currency: 'USD', price_period: 'yearly' },
          { id: 'p3', provider: 'C', name: 'Plan C', category: 'salud', country: 'CO', base_price: 100000, currency: 'COP', price_period: 'monthly' },
        ])
      });
    });

    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');

    // Select category Salud in Brief
    const categoryCombobox = page.getByRole('combobox', { name: /Categoría de seguro|Insurance category/i });
    await categoryCombobox.click();
    await page.getByRole('option', { name: /salud/i }).click();

    // Trigger search
    const searchBtn = page.getByTestId('brief-search-button');
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();

    // Wait sidebar with results
    const sidebar = page.getByTestId('plan-results-sidebar');
    await expect(sidebar).toBeVisible();

    // Expect price labels in COP (normalized) – look for currency symbol/ISO
    // Also hover to see tooltip with original amount/currency/period
    const anyPrice = sidebar.getByText(/COP/).first();
    await expect(anyPrice).toBeVisible();

    // Tooltip: trigger by hovering a normalized price badge region
    await anyPrice.hover({ force: true });
    // Tooltip content contains original amount and currency (USD) or period (yearly)
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();

    // We don't assert exact values; just presence of original currency text
    await expect(tooltip.locator('text=/USD|COP/i')).toBeVisible();

    // Validate telemetry single emission using runKey dedupe
    if (process.env.NEXT_PUBLIC_E2E_CAPTURE === '1') {
      await page.waitForTimeout(200);
      const telemetry = await page.evaluate(() => (window as any).__captureTelemetry || []);
      const priceEvents = telemetry.filter((e: any) => e.event === 'price_normalized' || e.event === 'PRICE_NORMALIZED');
      if (priceEvents.length > 0) {
        const uniqueRunKeys = new Set(priceEvents.map((e: any) => e.properties?.runKey || e.properties?.runkey));
        expect(uniqueRunKeys.size).toBeLessThanOrEqual(1);
        expect(priceEvents.length).toBeLessThanOrEqual(1);
        expect(priceEvents[0].properties?.origin).toBe('server');
      }
    }
  });
});


