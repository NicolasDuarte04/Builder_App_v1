import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('L13: OCR fallback path and client message on failure', () => {
  test('image-only PDF triggers OCR; failing OCR returns specific message', async ({ page }) => {
    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');

    // Open analyzer panel
    await page.getByTestId('open-analyzer-panel').click();

    // Route analyze-policy to simulate OCR failure
    await page.route('**/api/ai/analyze-policy', async (route) => {
      const url = route.request().url();
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error_code: 'OCR_FAILED', message: 'OCR failed' })
        });
      }
      return route.continue();
    });

    // Upload an "image-only" PDF (we can reuse sample as stand-in; behavior is mocked by route)
    const filePath = path.resolve(__dirname, '../../fixtures/sample-policy.pdf');
    const chooseBtn = page.getByRole('button', { name: /Elegir PDF|Choose PDF|Elegir PDFs|Choose PDFs/i });
    await chooseBtn.click();
    const chooser = await page.waitForEvent('filechooser');
    await chooser.setFiles([filePath]);

    // Click Analyze
    await page.getByRole('button', { name: /Analizar|Analyze/i }).click();

    // Expect client-side error message for OCR failure
    await expect(page.getByText(/No se pudo extraer texto del PDF|Could not extract text from PDF/i)).toBeVisible();
  });
});


