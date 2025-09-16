import { test, expect, Page } from '@playwright/test';

async function setDensityPref(page: Page, density: 'compact' | 'comfortable') {
  await page.addInitScript((d) => {
    try {
      localStorage.setItem('briki-prefs-store', JSON.stringify({ state: { toolbarDensity: d }, version: 0 }));
    } catch {}
  }, density);
}

async function measureCTA(page: Page) {
  // Espera breve por BootOverlay (~1200ms) y montaje
  await page.waitForTimeout(1400);
  const btn = page.locator('[data-testid="compare-selected-btn"]');
  await expect(btn).toBeVisible({ timeout: 10000 });

  const height = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="compare-selected-btn"]') as HTMLElement | null;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { offsetHeight: el.offsetHeight, styleHeight: cs.height };
  });
  if (!height) throw new Error('No se encontró el botón compare-selected-btn');

  // Captura del propio botón para evidencia clara
  await btn.screenshot({ path: 'playwright-report/quick-action-bar-btn.png' });
  return height;
}

test.describe('QuickActionBar density visual measurement', () => {
  test('measures CTA heights and captures screenshots (compact vs comfortable)', async ({ page }) => {
    // Compact
    await setDensityPref(page, 'compact');
    await page.goto('/assistant?e2e=1');
    const compact = await measureCTA(page);
    await expect.soft(compact.styleHeight).toBe('40px');
    await page.screenshot({ path: 'playwright-report/quick-action-bar-compact.png', fullPage: false });

    // Comfortable
    await setDensityPref(page, 'comfortable');
    await page.goto('/assistant?e2e=1');
    const comfortable = await measureCTA(page);
    await expect.soft(comfortable.styleHeight).toBe('44px');
    await page.screenshot({ path: 'playwright-report/quick-action-bar-comfortable.png', fullPage: false });

    // eslint-disable-next-line no-console
    console.log('[density]', { compact, comfortable });
  });
});


