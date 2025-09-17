import { test, expect } from '@playwright/test';

test.describe('BriefPanel readOnly + states (E2E)', () => {
  test('readOnly disables inputs and shows empty', async ({ page }) => {
    await page.goto('/assistant?e2e=1&briefReadOnly=1&briefState=empty');
    // Category select disabled
    await expect(page.getByTestId('brief-category-select')).toBeDisabled();
    // Budget input disabled
    await expect(page.getByTestId('brief-budget-input')).toBeDisabled();
    // Persona & Notes disabled
    await expect(page.getByTestId('brief-persona-input')).toBeDisabled();
    await expect(page.getByTestId('brief-notes-input')).toBeDisabled();
    // Search disabled
    await expect(page.getByTestId('brief-search-button')).toBeDisabled();
    // Empty state present
    await expect(page.getByTestId('brief-empty-state')).toBeVisible();
  });

  test('loading state renders with aria-busy', async ({ page }) => {
    await page.goto('/assistant?e2e=1&briefReadOnly=1&briefState=loading');
    const el = page.getByTestId('brief-loading-state');
    await expect(el).toBeVisible();
    await expect(el).toHaveAttribute('aria-busy', 'true');
  });

  test('error state renders with role=alert', async ({ page }) => {
    await page.goto('/assistant?e2e=1&briefReadOnly=1&briefState=error');
    const el = page.getByTestId('brief-error-state');
    await expect(el).toBeVisible();
    await expect(el).toHaveAttribute('role', 'alert');
  });
});


