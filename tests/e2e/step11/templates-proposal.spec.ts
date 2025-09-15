import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event?: string; properties?: any; timestamp: number }>;
  }
}

test.describe('No-Catalog → Templates → Proposal Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up telemetry capture
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

    // Mock the plan search API to return no results, forcing template generation
    await page.route('**/api/copilot/search', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plans: [] }) });
    });

    await page.goto('/assistant');
    await page.getByTestId('chat-input').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should generate templates and create a proposal from them', async ({ page }) => {
    // Step 1: Trigger a search by submitting the brief to get no-catalog results
    await page.getByTestId('brief-category-select').click();
    await page.getByText('Salud').click();
    await page.getByTestId('brief-search-button').click();

    // Step 2: Wait for results sidebar and templates to be visible
    await expect(page.getByTestId('plan-results-sidebar')).toBeVisible({ timeout: 15000 });
    const templateCards = page.locator('div:has-text("Plantillas Sugeridas") + div > div');
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
    
    // Step 3: Verify TEMPLATES_GENERATED event was fired
    const telemetry = await page.evaluate(() => window.__captureTelemetry);
    const templatesGeneratedEvent = telemetry.find(t => t.event === 'TEMPLATES_GENERATED');
    expect(templatesGeneratedEvent).toBeDefined();
    expect(templatesGeneratedEvent?.properties?.templateCount).toBeGreaterThan(0);

    // Step 4: Add at least two templates to the comparator
    const templateCount = await templateCards.count();
    expect(templateCount).toBeGreaterThanOrEqual(2);
    await templateCards.nth(0).getByRole('button', { name: 'Agregar a comparación' }).click();
    await templateCards.nth(1).getByRole('button', { name: 'Agregar a comparación' }).click();

    // Step 5: The "Create Proposal" button should be enabled in the quick actions toolbar
    const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
    const createProposalButton = toolbar.getByTestId('create-proposal-button');
    await expect(createProposalButton).toBeEnabled();
    await createProposalButton.click();

    // Step 6: Wait for proposal generation to start (spinner) and complete (toast/actions)
    await expect(createProposalButton).toContainText('Generando');
    await expect(page.getByRole('button', { name: 'Abrir' })).toBeVisible({ timeout: 25000 });

    // Step 7: Verify final telemetry events
    const finalTelemetry = await page.evaluate(() => window.__captureTelemetry);
    const events = finalTelemetry.map(t => t.event);
    
    expect(events).toContain('PROPOSAL_GENERATION_STARTED');
    expect(events).toContain('PROPOSAL_GENERATION_COMPLETED');
    expect(events).toContain('TIME_TO_PROPOSAL_MS');
    
    const timeToProposalEvent = finalTelemetry.find(t => t.event === 'TIME_TO_PROPOSAL_MS');
    expect(timeToProposalEvent?.properties?.durationMs).toBeGreaterThan(0);
  });
});
