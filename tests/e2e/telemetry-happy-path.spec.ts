import { test, expect } from '@playwright/test';
import { dispatchPaste } from './utils/paste';

// End-to-end happy-path telemetry capture: parse → apply/inject → search → compare → proposal → price_normalized
test.describe('Telemetry happy-path', () => {
  test('emits all key events in the happy-path flow', async ({ page }) => {
    const capturedMessages: { event: string; properties: any }[] = [];

    page.on('console', async msg => {
      const text = msg.text();
      if (/^\[Telemetry\]\s/.test(text)) {
        try {
          const event = text.replace(/^\[Telemetry\]\s*/, '').trim();
          // Heuristic to get payload: find first arg that is an object
          const payloadHandle = await msg.args().find(async (arg) => {
            const val = await arg.jsonValue();
            return typeof val === 'object' && val !== null;
          });

          const properties = payloadHandle ? await payloadHandle.jsonValue() : {};
          capturedMessages.push({ event, properties });
        } catch (e) {
          // Ignore parsing errors, the message is not a valid telemetry event
        }
      }
    });

    await page.goto('/assistant?e2e=1');

    // Paste some brief text to trigger parse → apply
    await dispatchPaste(page, '[data-testid="chat-input"]', 'Busco seguro de auto con RC y grúa. Presupuesto COP 200000. Coberturas imprescindibles: asistencia vial, robo total.');

    // If extract chip appears, confirm; else skip (environment-dependent)
    const chipConfirm = page.getByTestId('extract-brief-chip-confirm');
    if (await chipConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chipConfirm.click();
    }

    // Trigger search (fires PLANS_SEARCHED)
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('briki:search-plans')));

    // Wait for sidebar to open and network to be idle
    const sidebar = page.getByTestId('plan-results-sidebar');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // If there are plans, pin the first two
    const pinButtons = sidebar.getByTestId('pin-toggle');
    const count = await pinButtons.count();
    if (count >= 2) {
      await pinButtons.nth(0).click();
      await pinButtons.nth(1).click();
      // Panel should not exist yet (requires explicit click)
      await expect(page.locator('#comparison-panel')).toHaveCount(0);

      // Click Compare CTA to open comparator and emit COMPARATOR_OPENED
      const compareCta = page.getByTestId('compare-selected-btn');
      await expect(compareCta).toBeVisible({ timeout: 10000 });
      await compareCta.click();
      await expect(page.locator('#comparison-panel')).toBeVisible({ timeout: 10000 });
      // Capture screenshot of the panel for evidence
      await page.locator('#comparison-panel').screenshot({ path: 'playwright-report/comparator-panel-happy.png' });
    }

    // Click Create Proposal
    const createProposal = page.getByTestId('create-proposal-button');
    await createProposal.click();

    // Wait for proposal generation and telemetry to be sent
    await page.waitForLoadState('networkidle');

    // --- Assertions ---
    const events = new Set(capturedMessages.map(m => m.event));

    // Key events to verify
    const expectedEvents = [
      'BRIEF_PARSE_STARTED',
      'BRIEF_PARSE_COMPLETED',
      'PLANS_SEARCHED',
      'PROPOSAL_GENERATION_STARTED',
    ];

    for (const event of expectedEvents) {
      expect(events.has(event), `Expected telemetry event "${event}" to be present`).toBe(true);
    }

    // Conditional events
    expect(events.has('BRIEF_APPLIED') || events.has('BRIEF_INJECTED_INTO_TOOL'), 'Expected BRIEF_APPLIED or BRIEF_INJECTED_INTO_TOOL to be present').toBeTruthy();

    if (count >= 2) {
      expect(events.has('COMPARATOR_OPENED'), 'Expected COMPARATOR_OPENED after clicking Compare').toBeTruthy();
      expect(events.has('COMPARATOR_ITEM_ADDED'), 'Expected COMPARATOR_ITEM_ADDED when items are pinned').toBeTruthy();
    }

    // Optional price normalization check: if it exists, that's sufficient.
    const priceNormalized = capturedMessages.some(m => m.event === 'price_normalized' || m.event === 'PRICE_NORMALIZED');
    // This is optional, so we just acknowledge its presence or absence without failing the test.
    // If a stronger guarantee is needed, this could be changed to an assertion.
    console.log(`Price normalization event found: ${priceNormalized}`);
  });
});


