import { test, expect } from '@playwright/test';

test.describe('L13: No category → chooser opens → selecting triggers results', () => {
  test('clicking Search Plans opens CategoryChooser; selecting category triggers results', async ({ page }) => {
    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');

    // Ensure brief has no category initially (default)
    // Click Search Plans
    const searchBtn = page.getByTestId('brief-search-button');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    // Category chooser dialog should open
    const chooserButton = page.getByTestId('category-chooser-salud');
    await expect(chooserButton).toBeVisible();

    // Select Salud
    await chooserButton.click();

    // After selection, sidebar with results should appear
    await expect(page.getByTestId('plan-results-sidebar')).toBeVisible({ timeout: 15000 });
  });
});


