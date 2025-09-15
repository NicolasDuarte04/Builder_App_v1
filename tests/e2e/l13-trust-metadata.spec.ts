import { test, expect } from '@playwright/test';

// Minimal e2e: verifies trust metadata line renders when flag is enabled
// and that elements have stable data-testid="plan-trust-meta".

test.describe('Trust metadata rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Enable the feature flag in client runtime
    await page.addInitScript(() => {
      (window as any).process = (window as any).process || { env: {} };
      (window as any).process.env = (window as any).process.env || {};
      (window as any).process.env.NEXT_PUBLIC_ENABLE_TRUST_METADATA = 'true';
    });

    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');
  });

  test('renders trust line in plan results sidebar cards when data present', async ({ page }) => {
    // Ensure right panel opens with some results by performing a simple brief search
    const categorySelect = page.getByTestId('brief-category-select');
    await categorySelect.click();
    // Pick Salud (common)
    await page.getByRole('option', { name: /Salud|Health/i }).click();
    await page.getByTestId('brief-search-button').click();

    // Wait for sidebar
    await expect(page.getByTestId('plan-results-sidebar')).toBeVisible({ timeout: 20000 });

    // Look for any trust metadata line in visible cards
    const trustLines = page.getByTestId('plan-trust-meta');
    // We just assert at least one appears eventually; if some cards lack metadata it is okay
    await expect(trustLines.first()).toBeVisible({ timeout: 20000 });
  });
});
