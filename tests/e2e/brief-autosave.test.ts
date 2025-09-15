import { test, expect } from '@playwright/test';

test('brief autosave shows correct status transitions', async ({ page }) => {
  // Navigate to the page with the brief form
  await page.goto('/');
  
  // Wait for the brief form to be visible
  await page.waitForSelector('[data-testid="brief-category-select"]');
  
  // Type in the client persona field to trigger autosave
  const personaInput = await page.getByTestId('brief-persona-input');
  await personaInput.click();
  await personaInput.type('Test client');
  
  // Verify "Guardando..." appears
  const savingBadge = await page.getByTestId('autosave-badge');
  await expect(savingBadge).toBeVisible();
  await expect(savingBadge).toContainText('Guardando');
  
  // Wait for "Guardado" to appear (after ~700ms debounce)
  await expect(savingBadge).toContainText('Guardado', { timeout: 2000 });
});
