import { test, expect } from '@playwright/test';

test('Brief Select does not cause update-depth loop', async ({ page }) => {
  await page.addInitScript(() => { 
    (window as any).__cap = []; 
    const orig = console.error; 
    console.error = function(...a) { 
      if (String(a[0] || '').includes('Maximum update depth exceeded')) 
        (window as any).__cap.push(a[0]); 
      return orig.apply(this, a); 
    }; 
  });
  
  await page.goto('/assistant');
  
  const trigger = page.getByTestId('brief-category-select');
  await expect(trigger).toBeVisible();
  
  // open/close/select rapidly
  for (let i = 0; i < 8; i++) { 
    await trigger.click(); 
    await page.keyboard.press('ArrowDown'); 
    await page.keyboard.press('Enter'); 
  }
  
  const errs = await page.evaluate(() => (window as any).__cap);
  expect(errs).toEqual([]);
});
