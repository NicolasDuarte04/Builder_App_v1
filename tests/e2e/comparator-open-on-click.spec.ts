import { test, expect } from '@playwright/test';

async function seedTwoCompareItemsViaStore(page: any) {
  await page.goto('/assistant?e2e=1');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const store: any = (window as any).useCompareStore;
    if (!store?.getState) return;
    const add = store.getState().add;
    add({
      id: 'plan-1',
      name: 'Plan A',
      provider: 'Provider A',
      priceCop: 100000,
      priceEstCop: null,
      coverages: ['asistencia', 'robo', 'vidrios'],
      exclusions: ['Exclusion A'],
      waitingTimes: ['15 días'],
      source: { kind: 'catalog' },
      updatedAt: new Date().toISOString(),
    });
    add({
      id: 'plan-2',
      name: 'Plan B',
      provider: 'Provider B',
      priceCop: 120000,
      priceEstCop: null,
      coverages: ['asistencia'],
      exclusions: ['Exclusion B'],
      waitingTimes: ['30 días'],
      source: { kind: 'catalog' },
      updatedAt: new Date().toISOString(),
    });
  });
}

async function getCapturedTelemetry(page: any) {
  return await page.evaluate(() => (window as any).__captureTelemetry || []);
}

async function expectNoComparisonPanel(page: any) {
  const exists = await page.evaluate(() => !!document.getElementById('comparison-panel'));
  expect(exists).toBeFalsy();
}

async function expectComparisonPanelVisible(page: any) {
  await page.waitForSelector('#comparison-panel', { state: 'visible', timeout: 8000 });
}

test('Panel se abre solo tras click y emite COMPARATOR_OPENED', async ({ page }) => {
  await seedTwoCompareItemsViaStore(page);

  // No panel aún con 2 items
  await expectNoComparisonPanel(page);

  // Click CTA
  const cta = page.getByTestId('compare-selected-btn');
  await expect(cta).toBeVisible({ timeout: 10000 });
  await cta.click();

  // Panel visible
  await expectComparisonPanelVisible(page);
  await page.locator('#comparison-panel').screenshot({ path: 'playwright-report/comparator-panel.png' });

  // Evento
  const events = await getCapturedTelemetry(page);
  const opened = events.filter((e: any) => e.event === 'comparator_opened');
  expect(opened.length).toBeGreaterThan(0);
});
