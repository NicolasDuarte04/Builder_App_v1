import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; properties?: any; timestamp: number }>;
  }
}

test.describe('Proposals → Signed URL + Copy link', () => {
  test('should return signed URL and emit share event on copy', async ({ page }) => {
    // Capture telemetry emitted in client
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

    // Mock the generate endpoint response with a signed URL
    await page.route('**/api/proposals/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://files.example.com/proposals/123.pdf?token=abc123&exp=999999',
          urlKind: 'signed',
          id: 'prop_123',
          pages: 2,
          bytes: 102400,
          requestId: 'req_test_signed',
        }),
      });
    });

    await page.goto('/assistant?e2e=1', { waitUntil: 'networkidle' });

    // Minimal search + pin flow to ensure there is at least one candidate
    const categorySelect = page.getByTestId('brief-category-select');
    await expect(categorySelect).toBeVisible({ timeout: 20000 });
    try {
      await categorySelect.selectOption({ index: 0 });
    } catch {
      await categorySelect.click();
      await page.locator('[role="option"]').first().click();
    }
    const budget = page.getByTestId('brief-budget-input');
    if (await budget.isVisible({ timeout: 1000 }).catch(() => false)) {
      await budget.fill('300000');
    }
    await page.getByTestId('brief-search-button').click();
    const sidebar = page.getByTestId('plan-results-sidebar');
    await expect(sidebar).toBeVisible({ timeout: 40000 });
    const pinButtons = sidebar.getByTestId('pin-toggle');
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('[data-testid="plan-results-sidebar"] [data-testid="pin-toggle"]');
      return els.length >= 1;
    }, undefined, { timeout: 20000 });
    await pinButtons.nth(0).click();

    // Ensure quick actions are visible and button is enabled
    const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
    const createBtn = toolbar.getByTestId('create-proposal-button');
    await expect(createBtn).toBeVisible({ timeout: 15000 });

    // Click create → triggers mocked API, then inline action bar should appear with Copy
    await createBtn.click();

    // Wait until inline action bar appears (Open + Copy)
    const copyBtn = page.getByRole('button', { name: /Copy link|Copiar enlace/i });
    await expect(copyBtn).toBeVisible({ timeout: 15000 });

    // Click Copy and confirm clipboard has the signed URL with token
    await copyBtn.click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('token=');

    // Validate that the share event was emitted
    const events = await page.evaluate(() => (window as any).__captureTelemetry || []);
    const share = events.find((e: any) => e.event === 'proposal.share.link');
    expect(share).toBeTruthy();
    expect(String(share?.properties?.url || '')).toContain('token=');
  });
});


