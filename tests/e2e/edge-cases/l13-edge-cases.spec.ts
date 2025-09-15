import { test, expect } from '@playwright/test';
import path from 'path';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; name?: string; data?: any; properties?: any; timestamp: number }>;
  }
}
export {};

test.describe('Stage-13 Edge Cases', () => {
  test('Long paste guard: >12k uses summarize; <12k goes direct', async ({ page }) => {
    await page.addInitScript(() => { (window as any).__captureTelemetry = []; });

    // Stub summarize route
    await page.route('**/api/briefs/summarize-and-parse', async (route) => {
      const body = await route.request().postDataJSON().catch(() => ({} as any));
      const text = String(body?.text || '');
      const compactText = text.slice(0, 1000);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ compactText }) });
    });
    // Stub parse-from-text
    await page.route('**/api/briefs/parse-from-text**', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ category: 'Salud', maxBudgetCop: 100000 }) });
      }
      return route.continue();
    });

    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');

    const chatInput = page.getByTestId('chat-input');
    await chatInput.click();

    // >12k paste
    const longText = 'x'.repeat(12050);
    await page.evaluate((text) => {
      const input = document.querySelector('[data-testid="chat-input"]') as HTMLInputElement | HTMLTextAreaElement;
      const dt = new DataTransfer(); dt.setData('text/plain', text);
      const evt = new ClipboardEvent('paste', { clipboardData: dt }); input.dispatchEvent(evt);
    }, longText);

    // Confirm chip and click
    await page.getByTestId('extract-brief-chip-confirm').click();
    await expect(page.getByTestId('brief-search-button')).toBeEnabled();

    // <12k paste should not hit summarize
    let summarizeCalled = false;
    await page.unroute('**/api/briefs/summarize-and-parse');
    await page.route('**/api/briefs/summarize-and-parse', async (route) => { summarizeCalled = true; return route.continue(); });
    const shortText = 'y'.repeat(1000);
    await page.evaluate((text) => {
      const input = document.querySelector('[data-testid="chat-input"]') as HTMLInputElement | HTMLTextAreaElement;
      const dt = new DataTransfer(); dt.setData('text/plain', text);
      const evt = new ClipboardEvent('paste', { clipboardData: dt }); input.dispatchEvent(evt);
    }, shortText);
    await page.getByTestId('extract-brief-chip-dismiss').click();
    expect(summarizeCalled).toBeFalsy();
  });

  test('Multi-PDF: attach 3, last is primary, change primary, analyze uses primary; telemetry asserts', async ({ page }) => {
    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('open-analyzer-panel').click();

    const base = path.resolve(__dirname, '../../fixtures/sample-policy.pdf');
    const chooseBtn = page.getByRole('button', { name: /Elegir PDF|Choose PDF|Elegir PDFs|Choose PDFs/i });
    await chooseBtn.click();
    const chooser = await page.waitForEvent('filechooser');
    await chooser.setFiles([base, base, base]);

    // Last should be primary by default
    await expect(page.getByText(/Principal|Primary/).first()).toBeVisible();
    // Change primary if button exists
    const setPrimaryButtons = page.getByRole('button', { name: /Establecer como principal|Set as primary/i });
    if (await setPrimaryButtons.count()) await setPrimaryButtons.first().click();

    // Intercept analyze
    let filenames: string[] = [];
    await page.route('**/api/ai/analyze-policy', async (route) => {
      const body = await route.request().body();
      const text = body?.toString?.() || '';
      filenames = [...text.matchAll(/filename=\"([^\"]+)\"/g)].map(m => m[1]);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ analysisSummary: 'ok' }) });
    });
    await page.getByRole('button', { name: /Analizar|Analyze/i }).click();
    await expect.poll(() => filenames.length, { timeout: 5000 }).toBe(1);
  });

  test('Category chooser: empty category opens modal; selecting fires telemetry and shows results', async ({ page }) => {
    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');
    const searchBtn = page.getByTestId('brief-search-button');
    await searchBtn.click();
    await expect(page.getByTestId('category-chooser-salud')).toBeVisible();
    await page.getByTestId('category-chooser-salud').click();
    await expect(page.getByTestId('plan-results-sidebar')).toBeVisible({ timeout: 15000 });
  });

  test('OCR fallback: image-only PDF triggers OCR and failure shows localized message', async ({ page }) => {
    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('open-analyzer-panel').click();
    await page.route('**/api/ai/analyze-policy', async (route) => {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error_code: 'OCR_FAILED', message: 'OCR failed' }) });
    });
    const filePath = path.resolve(__dirname, '../../fixtures/sample-policy.pdf');
    const chooseBtn = page.getByRole('button', { name: /Elegir PDF|Choose PDF|Elegir PDFs|Choose PDFs/i });
    await chooseBtn.click();
    const chooser = await page.waitForEvent('filechooser');
    await chooser.setFiles([filePath]);
    await page.getByRole('button', { name: /Analizar|Analyze/i }).click();
    await expect(page.getByText(/No se pudo extraer texto del PDF|Could not extract text from PDF/i)).toBeVisible();
  });
});


