import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; properties?: any; timestamp: number }>;
  }
}

test.describe('No-catalog banner with CTAs + telemetry', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__captureTelemetry = [];
      try {
        const origLog = console.log.bind(console);
        console.log = ((...args: any[]) => {
          try {
            const first = args[0];
            if (typeof first === 'string' && first.startsWith('[Telemetry] ')) {
              const event = String(first.replace('[Telemetry] ', '')).trim();
              const payload = (args.length > 1 && typeof args[1] === 'object') ? args[1] : undefined;
              (window as any).__captureTelemetry.push({ event, properties: payload, timestamp: Date.now() });
            }
          } catch {}
          try { origLog(...args); } catch {}
        }) as any;
      } catch {}
    });

    // Disable templates fallback to force nocatalog path
    await page.addInitScript(() => {
      // localStorage flag used by getFlag() client-side
      localStorage.setItem('flag_enable_templates_fallback', '0');
      // Also set env-based guard through URL if needed
    });
  });

  test('shows nocatalog banner, emits view and click telemetry and opens chooser', async ({ page }) => {
    await page.route('**/api/plans_v2/search**', async (route) => {
      // Force no catalog results
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/assistant?e2e=1', { waitUntil: 'domcontentloaded' });

    // Fill brief minimal info and search to open sidebar
    await page.getByTestId('brief-category-select').click();
    await page.getByRole('option', { name: /salud/i }).click();
    await page.getByTestId('brief-search-button').click();

    // Sidebar opens
    await expect(page.getByTestId('plan-results-sidebar')).toBeVisible({ timeout: 20000 });

    // Expect nocatalog banner rendered
    await expect(page.getByTestId('nocatalog-banner')).toBeVisible();

    // Telemetry view should be emitted shortly after render
    await page.waitForTimeout(300);
    const viewEvents = await page.evaluate(() => (window.__captureTelemetry || []).filter(e => e.event === 'NOCATALOG_BANNER_VIEW' || e.event === 'nocatalog.banner.view'));
    expect(viewEvents.length).toBeGreaterThanOrEqual(1);

    // Click "Buscar otra categoría" CTA
    await page.getByTestId('nocatalog-cta-category').click();

    // Clicking should emit click telemetry with cta=choose_category
    await page.waitForTimeout(100);
    const clickEvents = await page.evaluate(() => (window.__captureTelemetry || []).filter(e => e.event === 'NOCATALOG_BANNER_CLICK' || e.event === 'nocatalog.banner.click'));
    expect(clickEvents.some((e: any) => e.properties?.cta === 'choose_category')).toBeTruthy();

    // Category chooser should open
    await expect(page.getByTestId('brief-category-select')).toBeVisible();
  });
});


