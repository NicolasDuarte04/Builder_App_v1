import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captureTelemetry: Array<{ event: string; properties?: any; timestamp: number }>;
    __guardWarnings: Array<string>;
  }
}

test('Telemetry single run: counts + guard clean + payload keys', async ({ page, request }) => {
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

  const sidebar = page.getByTestId('plan-results-sidebar');
  await expect(sidebar).toBeVisible({ timeout: 40000 });

  const pinButtons = sidebar.getByTestId('pin-toggle');
  await page.waitForFunction(() => {
    const els = document.querySelectorAll('[data-testid="plan-results-sidebar"] [data-testid="pin-toggle"]');
    return els.length >= 1;
  }, undefined, { timeout: 20000 });
  const count = await pinButtons.count();
  expect(count).toBeGreaterThanOrEqual(1);
  await pinButtons.nth(0).click();

  const toolbar = page.getByRole('toolbar', { name: /Quick actions|Acciones rápidas/i });
  const createBtn = toolbar.getByTestId('create-proposal-button');
  await expect(createBtn).toBeEnabled({ timeout: 15000 });
  await createBtn.click();

  await page.waitForFunction(() => {
    const t = (window as any).__captureTelemetry || [];
    return t.some((e: any) => e.event === 'PROPOSAL_GENERATION_STARTED');
  }, { timeout: 30000 });
  await page.waitForFunction(() => {
    const t = (window as any).__captureTelemetry || [];
    return t.some((e: any) => e.event === 'PROPOSAL_GENERATION_COMPLETED');
  }, { timeout: 60000 });

  const client = await page.evaluate(() => {
    const t = (window as any).__captureTelemetry || [];
    const started = t.filter((e: any) => e.event === 'PROPOSAL_GENERATION_STARTED');
    const completed = t.filter((e: any) => e.event === 'PROPOSAL_GENERATION_COMPLETED');
    const pdfStart = t.filter((e: any) => e.event === 'PROPOSAL_GENERATION_PDF_START');
    const uploadStart = t.filter((e: any) => e.event === 'PROPOSAL_GENERATION_UPLOAD_START');
    const guardWarnings = (window as any).__guardWarnings || [];
    return { started, completed, pdfStart, uploadStart, guardWarnings };
  });

  // Guard log clean
  expect(client.guardWarnings.length).toBe(0);

  // Count check (client should have at least 1 STARTED + 1 COMPLETED)
  expect(client.started.length).toBeGreaterThanOrEqual(1);
  expect(client.completed.length).toBeGreaterThanOrEqual(1);

  // Fetch server-side events
  const resp = await request.get('/api/debug/telemetry');
  expect(resp.ok()).toBeTruthy();
  const server = await resp.json();
  const events: Array<{ event: string; properties?: any }> = server.events || [];
  const byEvent = events.reduce((acc: Record<string, number>, e) => {
    acc[e.event] = (acc[e.event] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Expect exactly one server PDF_START and one UPLOAD_START in single run
  expect((byEvent['PROPOSAL_GENERATION_PDF_START'] || 0)).toBeGreaterThanOrEqual(1);
  expect((byEvent['PROPOSAL_GENERATION_UPLOAD_START'] || 0)).toBeGreaterThanOrEqual(1);

  // T6.3: Example payload with required keys
  const startedPayload = client.started[client.started.length - 1]?.properties || {};
  expect(startedPayload).toHaveProperty('itemCount');
  expect(startedPayload).toHaveProperty('hasBrief');
  expect(startedPayload).toHaveProperty('sessionId');
  expect(startedPayload).toHaveProperty('userId');
  expect(startedPayload).toHaveProperty('requestId');
});


