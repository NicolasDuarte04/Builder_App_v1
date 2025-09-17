import { test, expect } from '@playwright/test';

test.describe('Brief apply toggle optimistic save with rollback', () => {
  test('rolls back on 500 and shows toast', async ({ page }) => {
    // Go to assistant page where BriefPanel is present
    await page.goto('/assistant');
    await page.waitForLoadState('networkidle');

    // Ensure toggle is visible
    const toggle = page.getByRole('switch', { name: /aplicar/i });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // Set a category so search button enablement etc. doesn't interfere (not required but safe)
    const categorySelect = page.getByTestId('brief-category-select');
    await categorySelect.click();
    await page.getByRole('option', { name: /Vehículos|Vehiculos/ }).click();

    // Intercept POST /api/briefs to return 500
    await page.route('**/api/briefs', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'server_error' }) });
      }
      return route.continue();
    });

    // Capture apply state before
    const beforeChecked = await toggle.getAttribute('aria-checked');

    // Click to apply (optimistic true)
    await toggle.click();

    // Immediately should flip to true optimistically
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // After the failed save, it should rollback to false
    await expect.poll(async () => await toggle.getAttribute('aria-checked')).toBe('false');

    // Toast should appear via live region text (we use ARIA event bus)
    // We look for common error keywords shown in our toast
    const toastCandidate = page.locator('text=/Error|No se pudo aplicar el brief/i');
    await expect(toastCandidate).toHaveCountGreaterThan(0);

    // Clean route
    await page.unroute('**/api/briefs');
  });
});


