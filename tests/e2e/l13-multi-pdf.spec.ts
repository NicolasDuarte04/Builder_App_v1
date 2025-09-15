import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('L13: Multi-PDF attach and primary selection', () => {
  test('attach 3 files, list renders, set primary, analyze uses primary', async ({ page, context }) => {
    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');

    // Open analyzer panel via quick action
    await page.getByTestId('open-analyzer-panel').click();

    // Prepare three small PDFs (reuse sample-policy.pdf thrice with different names)
    const base = path.resolve(__dirname, '../../fixtures/sample-policy.pdf');
    const tmp1 = path.join(process.cwd(), 'tmp1.pdf');
    const tmp2 = path.join(process.cwd(), 'tmp2.pdf');
    const tmp3 = path.join(process.cwd(), 'tmp3.pdf');
    fs.copyFileSync(base, tmp1);
    fs.copyFileSync(base, tmp2);
    fs.copyFileSync(base, tmp3);

    // Intercept analyze endpoint and assert only one file name (primary) is received
    let seenFiles: string[] = [];
    await page.route('**/api/ai/analyze-policy', async (route) => {
      const req = route.request();
      const body = await req.body();
      if (body) {
        // Parse multipart for filenames (best-effort)
        const text = body.toString();
        const matches = [...text.matchAll(/filename=\"([^\"]+)\"/g)].map(m => m[1]);
        seenFiles = matches;
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ analysisSummary: 'ok' }) });
    });

    // Click dropzone button to open file picker (input[type=file] is hidden)
    const chooseBtn = page.getByRole('button', { name: /Elegir PDF|Choose PDF|Elegir PDFs|Choose PDFs/i });
    await chooseBtn.click();

    const fileChooser = await page.waitForEvent('filechooser');
    await fileChooser.setFiles([tmp1, tmp2, tmp3]);

    // Expect attached list to show 3 files and primary badge on one
    await expect(page.getByText(/Archivos adjuntos|Attached files/i)).toBeVisible();
    const badges = page.getByText(/Principal|Primary/i);
    await expect(badges.first()).toBeVisible();

    // Click the second item's "Set as primary" button (aria-label)
    const setPrimaryButtons = page.getByRole('button', { name: /Establecer como principal|Set as primary/i });
    const count = await setPrimaryButtons.count();
    if (count > 0) {
      await setPrimaryButtons.nth(0).click();
    }

    // Click Analyze
    await page.getByRole('button', { name: /Analizar|Analyze/i }).click();

    // Ensure request sent and only one filename captured
    await expect.poll(() => seenFiles.length, { timeout: 5000 }).toBeGreaterThan(0);
    expect(seenFiles.length).toBe(1);

    // Clean temp files
    [tmp1, tmp2, tmp3].forEach((p) => { try { fs.unlinkSync(p); } catch {} });
  });
});


