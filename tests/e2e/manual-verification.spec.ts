import { test, expect } from '@playwright/test';

test.describe('E2E: Deterministic assistant flow (brief → shortlist → pin → proposal)', () => {
  test.beforeEach(async ({ page }) => {
    // Init telemetry and error capture for each new document
    await page.addInitScript(() => {
      (window as any).__captureTelemetry = [];
      (window as any).__errors = [];
      window.addEventListener('error', e => {
        (window as any).__errors.push({ message: e.message, filename: (e as any).filename, lineno: (e as any).lineno, colno: (e as any).colno });
      });
      window.addEventListener('unhandledrejection', e => {
        const reason: any = (e as any).reason || {};
        (window as any).__errors.push({ message: reason?.message || 'Unhandled rejection' });
      });
    });

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        (page as any).__console_errors = (page as any).__console_errors || [];
        (page as any).__console_errors.push(msg.text());
      }
    });

    await page.goto('/assistant?e2e=1', { waitUntil: 'networkidle' });
  });

  test('fills brief, pins two plans, generates proposal, validates telemetry and no errors', async ({ page }) => {
    // 1) Select category
    const categorySelect = page.getByTestId('brief-category-select');
    await expect(categorySelect).toBeVisible();
    // Pick first available option
    // Prefer index 0; if placeholder exists at 0, UI should still accept it in e2e mode
    try {
      await categorySelect.selectOption({ index: 0 });
    } catch {
      // Fallback for non-native selects
      await categorySelect.click();
      await page.locator('[role="option"]').first().click();
    }

    // 2) Fill budget
    const budgetInput = page.getByTestId('brief-budget-input');
    await expect(budgetInput).toBeVisible();
    await budgetInput.fill('80000');

    // 3) Click search
    const searchButton = page.getByTestId('brief-search-button');
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // 4) Sidebar should appear
    const sidebar = page.getByTestId('plan-results-sidebar');
    await expect(sidebar).toBeVisible({ timeout: 40000 });

    // 5) Pin two plans inside the sidebar
    const pinButtons = sidebar.getByTestId('pin-toggle');
    // Wait until at least two are present
    await page.waitForFunction(async (locator) => {
      // Playwright exposes locator via injected handle; we re-query from document
      const els = document.querySelectorAll('[data-testid="plan-results-sidebar"] [data-testid="pin-toggle"]');
      return els.length >= 2;
    }, pinButtons, { timeout: 20000 });
    const count = await pinButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await pinButtons.nth(0).click();
    await pinButtons.nth(1).click();

    // 6) Create proposal becomes enabled (scoped to toolbar)
    const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
    const createBtn = toolbar.getByTestId('create-proposal-button');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();

    // 7) Ensure telemetry capture array exists, then click
    await page.addInitScript(() => {
      if (!Array.isArray((window as any).__captureTelemetry)) (window as any).__captureTelemetry = [];
    });
    await page.evaluate(() => { if (!Array.isArray((window as any).__captureTelemetry)) (window as any).__captureTelemetry = []; });
    await createBtn.click();

    // 8) Wait for telemetry events within 10s
    await page.waitForFunction(() => {
      const events = (window as any).__captureTelemetry || [];
      return events.some((e: any) => e.event === 'PROPOSAL_GENERATION_STARTED');
    }, undefined, { timeout: 10000 });

    await page.waitForFunction(() => {
      const events = (window as any).__captureTelemetry || [];
      return events.some((e: any) => e.event === 'PROPOSAL_GENERATION_COMPLETED');
    }, undefined, { timeout: 10000 });

    // 9) Assert no window or console errors
    const windowErrors = await page.evaluate(() => (window as any).__errors || []);
    expect(windowErrors).toHaveLength(0);
    const consoleErrors = (page as any).__console_errors || [];
    expect(consoleErrors).toHaveLength(0);
  });
});
