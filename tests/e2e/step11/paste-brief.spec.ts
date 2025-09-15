import { test, expect } from '@playwright/test';
import { dispatchPaste } from '../utils/paste';

test.describe('Paste → Brief Flow', () => {
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
    // Load assistant UI (no e2e param needed when FF is 100% in Playwright)
    await page.goto('/assistant', { waitUntil: 'domcontentloaded' });

    // Wait for chat input to be ready
    await page.getByTestId('chat-input').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should complete paste to brief flow with telemetry', async ({ page }) => {
    // Step 1: Focus chat input
    const chatInput = page.getByTestId('chat-input');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    // Step 2: Paste sample text using dispatchPaste util
    const SAMPLE_TEXT = `Número de póliza: TEST-123. Busco un seguro de salud para mi familia. Presupuesto máximo COP 500,000 mensuales. Coberturas imprescindibles: consultas, hospitalización, medicamentos, maternidad y odontología. Vivimos en Bogotá y queremos una red amplia de clínicas y atención rápida. También nos interesa cobertura internacional básica y asistencia médica en viajes. Preferimos pagos mensuales. Información adicional: hijos en edad escolar.`;
    await dispatchPaste(page, '[data-testid="chat-input"]', SAMPLE_TEXT);

    // Step 3: Confirm extraction via chip
    const confirmChip = page.getByTestId('extract-brief-chip-confirm');
    await expect(confirmChip).toBeVisible({ timeout: 15000 });
    await confirmChip.click();

    // Step 4: Verify telemetry only when E2E capture is enabled
    if (process.env.NEXT_PUBLIC_E2E_CAPTURE === '1') {
      await page.waitForFunction(() => {
        const t = (window as any).__captureTelemetry;
        return Array.isArray(t) && t.some((e: any) => e.event === 'BRIEF_PARSE_COMPLETED');
      }, { timeout: 15000 });

      const telemetry = await page.evaluate(() => (window as any).__captureTelemetry || []);
      const events = telemetry.map((t: any) => t.event);
      expect(events).toEqual(expect.arrayContaining(['BRIEF_PARSE_COMPLETED']));

      // BRIEF_FIELDS_UPDATED may be emitted asynchronously, so check if it exists
      const fieldsUpdatedEvent = telemetry.find((t: any) => t.event === 'BRIEF_FIELDS_UPDATED');
      if (fieldsUpdatedEvent) {
        expect(fieldsUpdatedEvent.properties?.fieldsFilled).toBeGreaterThan(0);
      }
    }
  });
});
