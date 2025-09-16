import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __pinWarnings?: string[];
    __pinErrors?: string[];
  }
}

test.describe('Pin flow runtime safety', () => {
  test.beforeEach(async ({ page }) => {
    // Stub search API to return deterministic plans
    await page.route('**/api/plans_v2/search', async (route) => {
      const sample = Array.from({ length: 5 }).map((_, i) => ({
        id: `e2e_${i+1}`,
        provider: `Proveedor ${i+1}`,
        name: `Plan Demo ${i+1}`,
        name_en: `Demo Plan ${i+1}`,
        category: 'auto',
        country: 'CO',
        base_price: 100000 + i * 5000,
        currency: 'COP',
        external_link: null,
        brochure_link: null,
        benefits: [
          'Cobertura básica',
          'Asistencia vial',
          `Extra ${i+1}`
        ],
        benefits_en: [],
        tags: ['auto', 'asistencia'],
        normalizedPrice: {
          amountCOPMonthly: 100000 + i * 5000,
          originalAmount: 100000 + i * 5000,
          originalCurrency: 'COP',
          originalPeriod: 'monthly',
          assumptions: []
        }
      }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sample) });
    });

    await page.addInitScript(() => {
      (window as any).__pinWarnings = [];
      (window as any).__pinErrors = [];
      try {
        const ow = console.warn.bind(console);
        console.warn = ((...args: any[]) => {
          try {
            const first = args[0];
            if (typeof first === 'string' && first.includes('Cannot update a component while rendering')) {
              (window as any).__pinWarnings!.push(String(first));
              try { (window as any).__e2eConsoleUpdate?.(); } catch {}
            }
          } catch {}
          try { ow(...args); } catch {}
        }) as any;

        const oe = console.error.bind(console);
        console.error = ((...args: any[]) => {
          try {
            const first = args[0];
            if (typeof first === 'string' && first.includes('Cannot update a component while rendering')) {
              (window as any).__pinErrors!.push(String(first));
              try { (window as any).__e2eConsoleUpdate?.(); } catch {}
            }
          } catch {}
          try { oe(...args); } catch {}
        }) as any;
      } catch {}

      // Lightweight in-page console overlay for E2E screenshots
      try {
        const styleId = 'e2e-console-overlay-style';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            #e2e-console-overlay { position: fixed; bottom: 8px; right: 8px; z-index: 999999; background: rgba(17, 24, 39, 0.92); color: #e5e7eb; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 10px; max-width: 420px; max-height: 180px; overflow: auto; box-shadow: 0 6px 20px rgba(0,0,0,0.35); font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
            #e2e-console-overlay .row { white-space: pre-wrap; word-break: break-word; opacity: 0.9; }
            #e2e-console-overlay .ok { color: #86efac; }
            #e2e-console-overlay .warn { color: #fbbf24; }
            #e2e-console-overlay .err { color: #fca5a5; }
            #e2e-console-overlay .muted { color: #9ca3af; }
          `;
          document.head.appendChild(style);
        }
        let overlay = document.getElementById('e2e-console-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'e2e-console-overlay';
          overlay.setAttribute('data-testid', 'e2e-console-overlay');
          overlay.setAttribute('aria-label', 'E2E Console Overlay');
          document.body.appendChild(overlay);
        }
        const update = () => {
          const warnings = (window as any).__pinWarnings || [];
          const errors = (window as any).__pinErrors || [];
          const all = [...warnings, ...errors];
          const matches = all.filter((s: any) => typeof s === 'string' && s.includes('Cannot update a component while rendering'));
          const header = matches.length === 0
            ? `<div class="row ok">Render-time setState: 0 warnings</div>`
            : `<div class="row warn">Render-time setState: ${matches.length} warning(s)</div>`;
          const tail = matches.slice(-5).map((m: string) => `<div class="row muted">• ${m.replace(/</g, '&lt;')}</div>`).join('');
          (overlay as HTMLElement).innerHTML = header + (tail ? `<div class="row">${tail}</div>` : '');
        };
        (window as any).__e2eConsoleUpdate = update;
        update();
      } catch {}
    });

    await page.goto('/assistant?e2e=1', { waitUntil: 'networkidle' });

    // Ensure app mounted and listeners registered
    await page.waitForTimeout(1600);

    // Ensure there are plans by performing a quick search via event (deterministic with route stub)
    await page.evaluate(() => {
      try { window.dispatchEvent(new CustomEvent('briki:search-plans')); } catch {}
    });
    // As a fallback, click the search button if present
    try {
      const budget = page.getByTestId('brief-budget-input');
      if (await budget.isVisible({ timeout: 1000 }).catch(() => false)) {
        await budget.fill('300000');
      }
      const searchBtn = page.getByTestId('brief-search-button');
      if (await searchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await searchBtn.click();
      }
    } catch {}

    const sidebar = page.getByTestId('plan-results-sidebar');
    await expect(sidebar).toBeVisible({ timeout: 40000 });

    // Wait for at least 3 pin buttons
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('[data-testid="plan-results-sidebar"] [data-testid="pin-toggle"]');
      return els.length >= 3;
    }, undefined, { timeout: 20000 });
  });

  test('3 cycles of burst pin/unpin do not produce render-time setState warnings', async ({ page }) => {
    // Capture console events during the critical interaction window
    const consoleEvents: { type: string; text: string }[] = [];
    page.on('console', (msg) => {
      consoleEvents.push({ type: msg.type(), text: msg.text() });
    });

    const sidebar = page.getByTestId('plan-results-sidebar');
    const pinButtons = sidebar.getByTestId('pin-toggle');

    // Perform 3 cycles
    for (let cycle = 0; cycle < 3; cycle++) {
      // Pin first 3 quickly using dynamic unpressed selector to avoid reordering issues
      const unpressed = sidebar.locator('[data-testid="pin-toggle"][aria-pressed="false"]');
      for (let target = 1; target <= 3; target++) {
        await unpressed.first().click();
        await expect(sidebar.locator('[data-testid="pin-toggle"][aria-pressed="true"]')).toHaveCount(target, { timeout: 10000 });
      }

      // Capture screenshot with pin counter only on first cycle
      if (cycle === 0) {
        const path = test.info().outputPath('sidebar-with-count.png');
        await sidebar.screenshot({ path });
        await test.info().attach('sidebar-with-count', { path, contentType: 'image/png' });
      }

      // Unpin the same 3 quickly using dynamic pressed selector
      for (let remaining = 3; remaining > 0; remaining--) {
        await sidebar.locator('[data-testid="pin-toggle"][aria-pressed="true"]').first().click();
        await expect(sidebar.locator('[data-testid="pin-toggle"][aria-pressed="true"]')).toHaveCount(remaining - 1, { timeout: 10000 });
      }
    }

    // Small settle
    await page.waitForTimeout(200);

    // Validate there were 0 warnings of the specific kind
    const cap = await page.evaluate(() => ({
      warnings: (window as any).__pinWarnings || [],
      errors: (window as any).__pinErrors || [],
    }));

    const all = [...cap.warnings, ...cap.errors];
    const matches = all.filter(s => s.includes('Cannot update a component while rendering'));

    // Attach logs for visibility
    await test.info().attach('pin-warnings.json', { body: JSON.stringify({ all, matches }, null, 2), contentType: 'application/json' });

    // Screenshot the in-page console overlay for evidence
    try {
      const overlay = page.getByTestId('e2e-console-overlay');
      await overlay.waitFor({ state: 'visible', timeout: 5000 });
      const overlayPath = test.info().outputPath('console-overlay.png');
      await overlay.screenshot({ path: overlayPath });
      await test.info().attach('console-overlay', { path: overlayPath, contentType: 'image/png' });
    } catch {}

    // Attach captured console events
    await test.info().attach('console-messages.json', { body: JSON.stringify(consoleEvents, null, 2), contentType: 'application/json' });

    expect(matches.length).toBe(0);
  });
});


