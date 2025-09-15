import { test, expect } from '@playwright/test';
import path from 'path';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; properties?: any; timestamp: number }>;
  }
}

test.describe('PDF → Brief Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up telemetry capture
    await page.addInitScript(() => {
      window.__captureTelemetry = [];
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

    await page.goto('/assistant?e2e=1');
    await page.getByTestId('chat-input').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should upload PDF, populate brief, and trigger search with correct telemetry', async ({ page }) => {
    // Step 1: Open the analyzer panel
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('briki:open-analyzer-panel', { detail: { source: 'quickAction' } })));
    // Wait for the panel to appear after the event
    await page.waitForTimeout(500);
    await expect(page.locator('#analyzer-panel')).toBeVisible();

    // Step 2: Upload the fixture PDF file
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    const samplePdfPath = path.resolve('./tests/fixtures/policy.pdf');
    await fileInput.setInputFiles(samplePdfPath);
    await expect(page.getByText('policy.pdf')).toBeVisible();

    // Step 3: Click the analyze button
    // The button text changes to "Analizando..." upon click
    const analyzeButton = page.getByRole('button', { name: 'Analizar póliza ahora' });
    await analyzeButton.click();
    await expect(page.getByRole('button', { name: 'Analizando...' })).toBeVisible();

    // Step 4: Wait for analysis to complete. A new assistant message with results will appear.
    await expect(page.locator('div:has-text("Análisis completado")').last()).toBeVisible({ timeout: 25000 });

    // Step 5: Click the main search button to trigger search with the new brief
    await page.getByTestId('brief-search-button').click();
    await expect(page.getByTestId('plan-results-sidebar')).toBeVisible({ timeout: 15000 });

    // Step 6: Verify telemetry
    const telemetry = await page.evaluate(() => window.__captureTelemetry);
    const events = telemetry.map(t => t.event);

    expect(events).toContain('BRIEF_FIELDS_UPDATED');
    expect(events).toContain('BRIEF_SUBMITTED');
    expect(events).toContain('PLANS_SEARCHED');

    // Check payload of BRIEF_FIELDS_UPDATED
    const fieldsUpdatedEvent = telemetry.find(t => t.event === 'BRIEF_FIELDS_UPDATED');
    expect(fieldsUpdatedEvent).toBeDefined();
    expect(fieldsUpdatedEvent?.properties?.source).toBe('upload');
    expect(fieldsUpdatedEvent?.properties?.fieldsFilled).toBeGreaterThan(2);
  });
});
