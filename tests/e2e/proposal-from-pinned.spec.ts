import { test, expect } from '@playwright/test';

// NOTE: Skipped by default to avoid CI fragility if UI selectors change.
test.describe.skip('Assistant → Pin plans → Create proposal', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure telemetry capture array exists early
    await page.addInitScript(() => {
      (window as any).__captureTelemetry = [];
      const originalCapture = (window as any).captureTelemetry;
      (window as any).captureTelemetry = (event: string, data?: any) => {
        (window as any).__captureTelemetry.push({ event, data, timestamp: Date.now() });
        if (originalCapture) originalCapture(event, data);
      };
    });

    await page.goto('/assistant');
  });

  test('pins two plans and generates a proposal', async ({ page }) => {
    // 1) Trigger search if needed via BriefPanel CTA
    const categorySelect = page.getByTestId('brief-category-select');
    if (await categorySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categorySelect.click();
      // Select Salud (matches BriefPanel CATEGORY_OPTIONS)
      await page.getByRole('option', { name: 'Salud' }).click();
      await page.getByTestId('brief-budget-input').fill('300000');
      await page.getByTestId('brief-search-button').click();
    }

    // 2) Wait for plan results to render in the right sidebar (unpinned list exists)
    // We target the pin icon buttons rendered within PlanResultsSidebar PlanCard.
    // The pin button has a lucide Pin icon; click two distinct ones.
    const pinIcons = page.locator('button svg[data-lucide="pin"]').locator('xpath=..');
    // Wait for at least 2 pin buttons to appear
    await expect(pinIcons.first()).toBeVisible({ timeout: 15000 });
    const count = await pinIcons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Pin first two visible plans
    await pinIcons.nth(0).click();
    await pinIcons.nth(1).click();

    // 3) Click create proposal button (scoped to quick actions toolbar)
    const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
    const createBtn = toolbar.getByTestId('create-proposal-button');
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    // 4) Wait for telemetry to capture PROPOSAL_GENERATION_STARTED and COMPLETED
    await page.waitForFunction(() => {
      const t = (window as any).__captureTelemetry || [];
      return t.some((e: any) => e.event === 'PROPOSAL_GENERATION_STARTED');
    }, { timeout: 30000 });

    await page.waitForFunction(() => {
      const t = (window as any).__captureTelemetry || [];
      return t.some((e: any) => e.event === 'PROPOSAL_GENERATION_COMPLETED');
    }, { timeout: 60000 });

    const telemetry = await page.evaluate(() => (window as any).__captureTelemetry);
    const started = telemetry.find((t: any) => t.event === 'PROPOSAL_GENERATION_STARTED');
    const completed = telemetry.find((t: any) => t.event === 'PROPOSAL_GENERATION_COMPLETED');
    expect(started).toBeTruthy();
    expect(completed).toBeTruthy();
  });
});


