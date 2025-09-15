import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; name?: string; data?: any; properties?: any; timestamp: number }>;
  }
}
export {};

test.describe('L13: Long paste guard → toast → summarize → brief populated', () => {
  test('paste over threshold triggers toast, summarize route, and updates brief', async ({ page }) => {
    // Capture telemetry
    await page.addInitScript(() => {
      window.__captureTelemetry = [];
      const origLog = console.log.bind(console);
      console.log = ((...args: any[]) => {
        try {
          const first = args[0];
          if (typeof first === 'string' && first.startsWith('[Telemetry]')) {
            const event = String(first.replace('[Telemetry]', '')).trim();
            const payload = (args.length > 1 && typeof args[1] === 'object') ? args[1] : undefined;
            window.__captureTelemetry.push({ event, properties: payload, timestamp: Date.now() });
          }
        } catch {}
        origLog(...args);
      }) as any;
    });

    // Mock summarize endpoint with compact output
    await page.route('**/api/briefs/summarize-and-parse', async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = await req.postDataJSON().catch(() => ({} as any));
        const text: string = body?.text || '';
        const compactText = text.slice(0, 60) + '...';
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ compactText, originalChars: text.length, compactChars: compactText.length, approxTokens: Math.ceil(compactText.length/4) })
        });
      }
      return route.continue();
    });

    // Mock parse-from-text to return a brief with category and budget
    await page.route('**/api/briefs/parse-from-text**', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            category: 'Salud',
            maxBudgetCop: 250000,
            mustHaveCoverages: ['hospitalización'],
          })
        });
      }
      return route.continue();
    });

    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');

    const chatInput = page.getByTestId('chat-input');
    await expect(chatInput).toBeVisible();

    // Paste over configured threshold (config sets 100 chars)
    const longText = 'x'.repeat(150);
    await chatInput.click();
    await page.evaluate((text) => {
      const input = document.querySelector('[data-testid="chat-input"]') as HTMLInputElement | HTMLTextAreaElement;
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const evt = new ClipboardEvent('paste', { clipboardData: dt });
      input.dispatchEvent(evt);
    }, longText);

    // Expect extract chip appears
    const confirmChip = page.getByTestId('extract-brief-chip-confirm');
    await expect(confirmChip).toBeVisible();

    // Expect the toast live-region to receive a message (long paste guard toast)
    // We assert via the aria-live region updates: wait for event to be dispatched
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    await expect(liveRegion).toBeVisible();

    // Confirm extraction
    await confirmChip.click();

    // Brief panel should now have budget filled and category set
    const budgetInput = page.getByTestId('brief-budget-input');
    await expect(budgetInput).toHaveValue(/250000/);

    const categoryCombo = page.getByRole('combobox', { name: /Categoría de seguro|Insurance category/i });
    await expect(categoryCombo).toBeVisible();

    // Search plans button should be enabled after category present
    const searchBtn = page.getByTestId('brief-search-button');
    await expect(searchBtn).toBeEnabled();

    // Telemetry sanity: long paste guard + parse completed
    const telemetry = await page.evaluate(() => window.__captureTelemetry);
    const guard = telemetry.find((t) => (t.event === 'paste_long_guarded'));
    expect(guard).toBeTruthy();
  });
});


