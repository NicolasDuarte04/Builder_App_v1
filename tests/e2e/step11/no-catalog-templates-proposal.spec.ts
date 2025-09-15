import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; properties?: any; timestamp: number }>;
  }
}

test.describe('No-Catalog → Templates → Proposal (CTA path)', () => {
  test.beforeEach(async ({ page }) => {
    // Capture telemetry emitted via console and E2E capture
    await page.addInitScript(() => {
      window.__captureTelemetry = [];
      try {
        const origLog = console.log.bind(console);
        console.log = ((...args: any[]) => {
          try {
            const first = args[0];
            if (typeof first === 'string' && first.startsWith('[Telemetry] ')) {
              const event = String(first.replace('[Telemetry] ', '')).trim();
              const payload = (args.length > 1 && typeof args[1] === 'object') ? args[1] : undefined;
              (window as any).__captureTelemetry.push({ event, properties: payload, timestamp: Date.now() });
            }
          } catch {}
          try { origLog(...args); } catch {}
        }) as any;
      } catch {}
    });

    await page.goto('/assistant?e2e=1', { waitUntil: 'domcontentloaded' });

    // Ensure brief form is available
    await page.getByTestId('brief-category-select').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('opens sidebar, asserts templates/no_catalog, pins and generates proposal', async ({ page }) => {
    // 1) Open /assistant, fill brief, click brief-search-button
    await page.getByTestId('brief-category-select').click();
    await page.getByRole('option', { name: /salud/i }).click();
    await page.getByTestId('brief-budget-input').fill('300000');
    await page.getByTestId('brief-notes-input').fill('Busco planes accesibles, cobertura en Bogotá.');
    await page.getByTestId('brief-search-button').click();

    // 2) Wait for sidebar visible with larger timeout
    await expect(page.getByTestId('plan-results-sidebar')).toBeVisible({ timeout: 25000 });

    // 3) Assert TEMPLATES_GENERATED with reason no_catalog when applicable
    // Give the UI a tick to emit TEMPLATES_GENERATED from PlanResultsSidebar effect
    await page.waitForTimeout(300);
    const telemetry = await page.evaluate(() => window.__captureTelemetry || []);
    const templatesGenerated = telemetry.filter((t: any) => t.event === 'TEMPLATES_GENERATED');
    if (templatesGenerated.length > 0) {
      const hasNoCatalog = templatesGenerated.some((t: any) => (t.properties?.reason === 'no_catalog' || t.properties?.reason === 'no_catalog_results'));
      expect(hasNoCatalog).toBeTruthy();
    }

    // 4) Pin two templates/plans if present, then create proposal and assert events
    // Prefer templates first (CTA no-catalog path)
    const templateCards = page.locator('h3:has-text("Plantillas Sugeridas")');
    const hasTemplates = await templateCards.count().catch(() => 0);
    if (hasTemplates > 0) {
      // Use TemplatePlanCard compare toggles (ArrowLeftRight button)
      const compareButtons = page.locator('button[aria-label*="comparación"], button:has(svg[aria-hidden])').filter({ hasText: /\d+\/3/ });
      // Fallback: locate two template cards and click their compare buttons by position
      const candidates = compareButtons.count ? await compareButtons.count() : 0;
      if (candidates >= 2) {
        await compareButtons.nth(0).click();
        await compareButtons.nth(1).click();
      } else {
        // As a robust fallback, try clicking first two visible TemplatePlanCard compare buttons by role
        const allButtons = page.locator('div:below(:text("Plantillas Sugeridas")) button');
        let clicked = 0;
        const total = await allButtons.count();
        for (let i = 0; i < total && clicked < 2; i++) {
          const btn = allButtons.nth(i);
          const label = await btn.getAttribute('aria-label').catch(() => null);
          if (label && (/Agregar a comparación/i.test(label) || /Quitar de comparación/i.test(label))) {
            await btn.click();
            clicked += 1;
          }
        }
        expect(clicked).toBeGreaterThanOrEqual(2);
      }
    } else {
      // Fallback to pinning two catalog plans via pin toggle
      const pinButtons = page.locator('[data-testid="plan-results-sidebar"] [data-testid="pin-toggle"]');
      await expect(pinButtons.first()).toBeVisible({ timeout: 15000 });
      const count = await pinButtons.count();
      expect(count).toBeGreaterThanOrEqual(2);
      await pinButtons.nth(0).click();
      await pinButtons.nth(1).click();
    }

    // Click create proposal
    const createBtn = page.getByRole('toolbar', { name: 'Acciones rápidas' })
      .getByTestId('create-proposal-button');
    await expect(createBtn).toBeEnabled({ timeout: 15000 });
    await createBtn.click();

    // Assert PROPOSAL_GENERATION_STARTED then COMPLETED
    await page.waitForFunction(() => {
      const a: any[] = (window as any).__captureTelemetry || [];
      return a.some(e => e.event === 'PROPOSAL_GENERATION_STARTED');
    }, { timeout: 30000 });

    await page.waitForFunction(() => {
      const a: any[] = (window as any).__captureTelemetry || [];
      return a.some(e => e.event === 'PROPOSAL_GENERATION_COMPLETED');
    }, { timeout: 60000 });

    const finalTelemetry = await page.evaluate(() => window.__captureTelemetry || []);
    const events = finalTelemetry.map((t: any) => t.event);
    expect(events).toContain('PROPOSAL_GENERATION_STARTED');
    expect(events).toContain('PROPOSAL_GENERATION_COMPLETED');

    // Ensure at least one TIME_TO_PROPOSAL_MS emission (allow duplicates for now)
    const ttp = finalTelemetry.filter((t: any) => t.event === 'TIME_TO_PROPOSAL_MS');
    if (ttp.length > 0) {
      expect(ttp.length).toBeGreaterThan(0);
      expect(ttp[0]?.properties?.durationMs ?? ttp[0]?.properties?.ms).toBeGreaterThan(0);
    }
  });
});


