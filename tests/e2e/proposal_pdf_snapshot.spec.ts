import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; properties?: any; timestamp: number }>;
  }
}

// Utility to build a tiny data: URL PDF with expected text and a simple date string
function buildDataPdf(): string {
  // This is a minimal PDF with the text "Propuesta Briki" and a simple date marker.
  // Pre-encoded as base64 for stability in tests.
  const base64 =
    'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovTmFtZSAvRjEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCgo1IDAgb2JqCjw8Ci9MZW5ndGggMTY1Cj4+CnN0cmVhbQpCBTAgMCAwIFJHCi9GMSAyNCBUZgovVGYgNTAgNzUwIFRECiAoUHJvcHVlc3RhIEJyaWtpKSBUMgowIDAgMCAxIDAgMCAyNTAgNzAwIFQKKEZlY2hhOiAyMDI1LTA5LTE3KSBUMgoKRU5EU1RSRUFNCmVuZG9iagoKc3RhcnR4cmVmCjY1MAolJUVPRgo=';
  return `data:application/pdf;base64,${base64}`;
}

test.describe('Proposals → PDF snapshot', () => {
  test('should show a PDF URL; snapshot includes text and date', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__captureTelemetry = [];
    });

    // Mock the generate endpoint to return a data: URL (public none) for quick assertions
    await page.route('**/api/proposals/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: buildDataPdf(),
          urlKind: 'none',
          id: 'prop_mock_data_pdf',
          pages: 1,
          bytes: 2048,
          requestId: 'req_pdf_snapshot',
        }),
      });
    });

    await page.goto('/assistant?e2e=1', { waitUntil: 'networkidle' });

    // Ensure at least one candidate via quick pin
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

    const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
    const createBtn = toolbar.getByTestId('create-proposal-button');
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    // Wait for inline action bar and open the PDF link in a new tab
    const openBtn = page.getByRole('button', { name: /Open|Abrir/i });
    await expect(openBtn).toBeVisible({ timeout: 15000 });

    const [pdfPage] = await Promise.all([
      page.waitForEvent('popup'),
      openBtn.click(),
    ]);

    // data: URL should be loaded
    await pdfPage.waitForLoadState('domcontentloaded');
    const url = pdfPage.url();
    expect(url.startsWith('data:application/pdf')).toBeTruthy();

    // Assert expected text markers by evaluating PDF bytes rendered as data URL string
    // We cannot trivially parse PDF in the browser here; instead we validate the embedded strings presence in base64
    const href = await pdfPage.evaluate(() => location.href);
    expect(href).toContain('UHJvcHVlc3RhIEJyaWtp'); // "Propuesta Briki" base64
    expect(href).toContain('RmVjaGE6IDIwMjUtMDktMTc'); // "Fecha: 2025-09-17" base64 fragment
  });
});


