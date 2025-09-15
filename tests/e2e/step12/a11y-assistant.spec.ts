import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('A11y smoke - Assistant', () => {
  test.beforeEach(async ({ page }) => {

    // Mock shortlist search to surface the action rail with Create Proposal
    await page.route('**/api/copilot/search', async (route) => {
      const body = {
        plans: [
          {
            id: 'plan-1',
            name_es: 'Plan Salud Básico',
            insurers: { name: 'Aseguradora X' },
            plan_pricing: [{ premium_min: 100000, premium_max: 150000, currency: 'COP', billing_period: 'mes' }],
            plan_benefits: [{ key: 'cobertura básica' }, { key: 'hospitalización' }],
            last_verified_at: new Date().toISOString(),
          },
        ],
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto('/assistant?e2e=1');
    await page.getByTestId('chat-input').waitFor({ state: 'visible', timeout: 20000 });

    // Submit brief to render shortlist and quick actions
    await page.getByTestId('brief-category-select').click();
    await page.getByText(/Salud|Health/i).first().click();
    await page.getByTestId('brief-search-button').click();
    await page.getByTestId('plan-results-sidebar').waitFor({ state: 'visible', timeout: 20000 });

    // Expand analyzer panel then switch to portal prep to expose chips
    await page.evaluate(() => {
      try { window.dispatchEvent(new CustomEvent('briki:open-analyzer-panel', { detail: { source: 'quickAction' } })); } catch {}
      try { window.dispatchEvent(new CustomEvent('briki:pdf-selected', { detail: { name: 'dummy.pdf', size: 1234 } })); } catch {}
    });

  });

  test('has no serious/critical axe violations and key controls are accessible', async ({ page }) => {
    // 1) Axe run - only fail on serious/critical
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .exclude('[data-testid="chat-input"]') // Exclude dynamic chat input from color contrast
      .analyze();
    
    // Filter to only serious/critical violations
    const seriousViolations = accessibilityScanResults.violations.filter(
      violation => ['serious', 'critical'].includes(violation.impact)
    );
    
    expect(seriousViolations).toHaveLength(0);

    // 2) "Create proposal" button is only in the quick actions toolbar and focusable
    const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
    await expect(toolbar).toBeVisible();
    const createBtn = toolbar.getByTestId('create-proposal-button');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();
    await createBtn.focus();
    await expect(createBtn).toBeFocused();

    // 3) PDF dropzone reachable by keyboard with role/name
    // Dropzone is role="button" with aria-label upload.upload_prompt
    const dropzone = page.getByRole('button', { name: /Sube un PDF para analizar|Upload a PDF to analyze/i });
    await expect(dropzone).toBeVisible();
    await dropzone.focus();
    await expect(dropzone).toBeFocused();

    // 4) A coverage/focus chip toggles with Space (role=checkbox)
    // Chips live in portal prep; ensure prep is visible by selecting a dummy file name in state if needed
    // We try to locate any role checkbox within the assistant page
    const chip = page.getByRole('checkbox').first();
    await chip.focus();
    await expect(chip).toBeFocused();
    const initialChecked = await chip.getAttribute('aria-checked');
    await page.keyboard.press(' ');
    const afterChecked = await chip.getAttribute('aria-checked');
    expect(initialChecked).not.toBe(afterChecked);
  });
});


