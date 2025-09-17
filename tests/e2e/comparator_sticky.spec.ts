import { test, expect } from '@playwright/test';

async function seedTwoCompareItemsViaStore(page: any) {
  await page.goto('/assistant?e2e=1');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const store: any = (window as any).useCompareStore;
    if (!store?.getState) return;
    const add = store.getState().add;
    add({
      id: 'plan-1', name: 'Plan A', provider: 'Provider A', priceCop: 100000,
      priceEstCop: null, coverages: ['asistencia','robo','vidrios'], exclusions: ['Exclusion A'],
      waitingTimes: ['15 días'], source: { kind: 'catalog' }, updatedAt: new Date().toISOString(),
      deductibles: '2 SMMLV'
    });
    add({
      id: 'plan-2', name: 'Plan B', provider: 'Provider B', priceCop: 120000,
      priceEstCop: null, coverages: ['asistencia'], exclusions: ['Exclusion B'],
      waitingTimes: ['30 días'], source: { kind: 'catalog' }, updatedAt: new Date().toISOString(),
      deductibles: '3 SMMLV'
    });
    add({
      id: 'plan-3', name: 'Plan C', provider: 'Provider C', priceCop: 130000,
      priceEstCop: null, coverages: ['vidrios'], exclusions: ['Exclusion C'],
      waitingTimes: ['45 días'], source: { kind: 'catalog' }, updatedAt: new Date().toISOString(),
      deductibles: '1 SMMLV'
    });
  });
}

test('Headers permanecen visibles al hacer scroll y tienen sombra', async ({ page }) => {
  await seedTwoCompareItemsViaStore(page);

  // Abre el comparador
  const cta = page.getByTestId('compare-selected-btn');
  await expect(cta).toBeVisible({ timeout: 10000 });
  await cta.click();

  const panel = page.locator('#comparison-panel');
  await expect(panel).toBeVisible();

  // Asegura que la tabla existe y tiene headers sticky
  const table = panel.locator('table.comparator-table');
  await expect(table).toBeVisible();
  const headerCells = table.locator('thead th.sticky-th');
  await expect(headerCells.first()).toBeVisible();

  // Fuerza suficiente contenido para scroll vertical, si no lo hay
  await page.evaluate(() => {
    const panel = document.getElementById('comparison-panel');
    if (panel) {
      // Ensure space below to allow scrolling
      const filler = document.createElement('div');
      filler.style.height = '1500px';
      filler.setAttribute('data-test', 'scroll-filler');
      panel.parentElement?.appendChild(filler);
    }
  });

  // Toma posición inicial de header
  const before = await headerCells.first().boundingBox();
  expect(before).toBeTruthy();

  // Scroll global de la página para activar sticky
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(200);

  // Header sigue visible y su Y no aumenta fuera de viewport top ~ permanece pegado
  const after = await headerCells.first().boundingBox();
  expect(after).toBeTruthy();
  // Debe seguir dentro del viewport cercano a la parte superior
  expect((after as any).y).toBeLessThan(120);

  // Verifica sombra: la clase en la tabla cambia cuando hay scroll
  const hasScrolledClass = await table.evaluate((el) => el.classList.contains('comparator-header--scrolled'));
  expect(hasScrolledClass).toBeTruthy();
});


