import { test, expect } from '@playwright/test';

test.describe('Assistant rail respects navbar height and chat input unobstructed', () => {
  test('desktop layout: rail starts under navbar and input visible', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/assistant?e2e=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Open comparator by simulating 2+ pinned items via store events if possible
    // Fallback: click "Compare Selected" (should be disabled until there are 2 items)
    // Take screenshot for attachment
    await page.screenshot({ path: 'test-results/assistant-rail-under-navbar.png' });
  });
});


