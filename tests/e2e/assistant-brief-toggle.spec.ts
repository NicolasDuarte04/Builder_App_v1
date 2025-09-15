import { test, expect } from '@playwright/test';

test.describe('Assistant Brief panel stress', () => {
  test('Brief panel toggle stress has no React errors', async ({ page }) => {
    // Arm console guard inside the page
    await page.addInitScript(() => {
      (function () {
        const targets = ['getSnapshot should be cached', 'Maximum update depth exceeded'];
        (window as any).__REACT_ERROR_HIT__ = false;
        (window as any).__REACT_ERROR_LOGS__ = [] as string[];
        const origError = console.error.bind(console);
        console.error = (...args: any[]) => {
          try {
            const msg = String(args && args[0] !== undefined ? args[0] : '');
            if (targets.some(t => msg.includes(t))) {
              (window as any).__REACT_ERROR_HIT__ = true;
              (window as any).__REACT_ERROR_LOGS__.push(msg);
            }
          } catch {}
          return origError(...args);
        };
        console.log('[Audit] React error traps armed');
      })();
    });

    await page.goto('/assistant');

    // Wait for the page to stabilize: look for the chat container or brief header
    await page.waitForLoadState('networkidle');

    // Locate the Brief header collapse/expand button by accessible name
    // It toggles aria-label between "Colapsar brief" and "Expandir brief"
    const toggleButton = page.getByRole('button', { name: /brief/i });
    await expect(toggleButton).toBeVisible({ timeout: 10000 });

    // Stress: toggle 10x quickly
    for (let i = 0; i < 10; i++) {
      await toggleButton.click();
      // small delay to let state settle a bit but still stress
      await page.waitForTimeout(60);
    }

    // Check that our guard did not trip
    const hit = await page.evaluate(() => (window as any).__REACT_ERROR_HIT__);
    const logs = await page.evaluate(() => (window as any).__REACT_ERROR_LOGS__);

    // Also verify that the two strings are not present in the DOM
    const domContainsBad1 = await page.locator(`text=/getSnapshot should be cached/`).count();
    const domContainsBad2 = await page.locator(`text=/Maximum update depth exceeded/`).count();

    if (hit || domContainsBad1 > 0 || domContainsBad2 > 0) {
      console.log('[Audit] React error logs:', logs);
    }

    expect(hit, 'console.error guard should not detect React errors').toBeFalsy();
    expect(domContainsBad1, 'DOM should not show "getSnapshot should be cached"').toBe(0);
    expect(domContainsBad2, 'DOM should not show "Maximum update depth exceeded"').toBe(0);
  });
});


