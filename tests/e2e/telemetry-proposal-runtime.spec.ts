import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event: string; properties?: any; timestamp: number }>;
    __guardWarnings: Array<string>;
  }
}

test.describe('Telemetry runtime validation: proposal flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__captureTelemetry = [];
      (window as any).__guardWarnings = [];

      try {
        const origWarn = console.warn.bind(console);
        console.warn = ((...args: any[]) => {
          try {
            const first = args[0];
            if (typeof first === 'string' && first.startsWith('[TelemetryGuard] ')) {
              (window as any).__guardWarnings.push(String(first));
            }
          } catch {}
          try { origWarn(...args); } catch {}
        }) as any;
      } catch {}
    });

    await page.goto('/assistant?e2e=1', { waitUntil: 'networkidle' });

    // Ensure there are plans to pin (run a quick search)
    const categorySelect = page.getByTestId('brief-category-select');
    await expect(categorySelect).toBeVisible({ timeout: 20000 });
    try {
      await categorySelect.selectOption({ index: 0 });
    } catch {
      await categorySelect.click();
      await page.locator('[role="option"]').first().click();
    }

    const budget = page.getByTestId('brief-budget-input');
    if (await budget.isVisible({ timeout: 1000 }).catch(() => false)) {
      await budget.fill('300000');
    }
    await page.getByTestId('brief-search-button').click();

    // Wait for results sidebar
    const sidebar = page.getByTestId('plan-results-sidebar');
    await expect(sidebar).toBeVisible({ timeout: 40000 });

    // Pin first two results
    const pinButtons = sidebar.getByTestId('pin-toggle');
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('[data-testid="plan-results-sidebar"] [data-testid="pin-toggle"]');
      return els.length >= 2;
    }, undefined, { timeout: 20000 });
    const count = await pinButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await pinButtons.nth(0).click();
    await pinButtons.nth(1).click();
  });

  test('3 runs → counts scale linearly, no guard warnings, consistent requestId per run', async ({ page }) => {
    const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
    const createBtn = toolbar.getByTestId('create-proposal-button');
    await expect(createBtn).toBeEnabled({ timeout: 10000 });

    const runRequestIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      await createBtn.click();
      await page.waitForFunction(() => {
        const t = (window as any).__captureTelemetry || [];
        return t.some((e: any) => e.event === 'PROPOSAL_GENERATION_STARTED');
      }, { timeout: 30000 });

      await page.waitForFunction(() => {
        const t = (window as any).__captureTelemetry || [];
        return t.some((e: any) => e.event === 'PROPOSAL_GENERATION_COMPLETED');
      }, { timeout: 60000 });

      // Allow telemetry queue to flush
      await page.waitForTimeout(300);

      const { reqId } = await page.evaluate(() => {
        const t = (window as any).__captureTelemetry || [];
        const started = [...t].reverse().find((x: any) => x.event === 'PROPOSAL_GENERATION_STARTED');
        const completed = [...t].reverse().find((x: any) => x.event === 'PROPOSAL_GENERATION_COMPLETED');
        const sid = started?.properties?.requestId;
        const cid = completed?.properties?.requestId;
        return { reqId: cid || sid };
      });
      expect(reqId).toBeTruthy();
      runRequestIds.push(reqId!);
    }

    const clientStats = await page.evaluate(() => {
      const t = (window as any).__captureTelemetry || [];
      // Count only unique requestIds per event kind
      const startedIds = new Set<string>();
      const completedIds = new Set<string>();
      for (const e of t) {
        if (e.event === 'PROPOSAL_GENERATION_STARTED' && e?.properties?.requestId) startedIds.add(e.properties.requestId);
        if (e.event === 'PROPOSAL_GENERATION_COMPLETED' && e?.properties?.requestId) completedIds.add(e.properties.requestId);
      }
      const started = startedIds.size;
      const completed = completedIds.size;
      return { started, completed, warnings: (window as any).__guardWarnings || [] };
    });

    expect(clientStats.started).toBe(3);
    expect(clientStats.completed).toBe(3);
    expect(clientStats.warnings.length).toBe(0);

    expect(new Set(runRequestIds).size).toBe(3);
  });
});


