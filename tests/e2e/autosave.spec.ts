import { test, expect } from '@playwright/test';

test.describe('Brief autosave', () => {
  test('shows correct autosave states and handles errors', async ({ page }) => {
    // Navigate to the page with the brief panel
    await page.goto('/');

    // Type in persona field and wait for "Guardando..." badge
    await page.getByTestId('brief-persona-input').fill('Empresario joven');
    const savingBadge = page.getByTestId('autosave-badge');
    await expect(savingBadge).toContainText('Guardando');

    // Type in notes field
    await page.getByTestId('brief-notes-input').fill('Necesita cobertura completa');
    
    // Wait for "Guardado" state
    await expect(savingBadge).toContainText('Guardado');

    // Mock network error for next save
    await page.route('/api/briefs', async (route) => {
      await route.abort('failed');
    });

    // Make another change to trigger error state
    await page.getByTestId('brief-persona-input').fill('Empresario joven actualizado');
    
    // Verify error state appears
    await expect(savingBadge).toContainText('Error');
  });
});
