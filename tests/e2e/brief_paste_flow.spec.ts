import { test, expect } from '@playwright/test';

test('paste flow: extract chip → brief fields → source chip', async ({ page }) => {
  // Start with clean state
  await page.goto('/?e2e=1');

  // Wait for chat input to be ready
  const chatInput = await page.getByTestId('chat-input');
  await chatInput.waitFor();

  // Prepare a long text to paste (>200 chars)
  const longText = `Cliente busca seguro de auto para su nuevo Mazda CX-30 2024. 
    Presupuesto máximo de 300,000 COP mensuales. 
    Necesita cobertura de pérdida total, responsabilidad civil y asistencia en carretera.
    Vive en Bogotá y usa el carro principalmente para ir al trabajo.
    Primera vez comprando seguro de auto.`.repeat(2); // Make it long enough

  // Paste the text
  await chatInput.fill(longText);
  await chatInput.dispatchEvent('paste');

  // Extract chip should appear
  const extractChip = await page.getByTestId('extract-brief-chip-confirm');
  await expect(extractChip).toBeVisible();

  // Click extract
  await extractChip.click();

  // Brief should be populated and source chip should appear
  await expect(page.getByTestId('brief-source-chip-paste')).toBeVisible();

  // Verify at least 2 fields were filled
  const categorySelect = await page.getByTestId('brief-category-select');
  const budgetInput = await page.getByTestId('brief-budget-input');
  
  let filledFields = 0;
  
  const categoryValue = await categorySelect.textContent();
  if (categoryValue && !categoryValue.includes('Select')) filledFields++;
  
  const budgetValue = await budgetInput.inputValue();
  if (budgetValue && budgetValue !== '') filledFields++;

  expect(filledFields).toBeGreaterThanOrEqual(2);

  // Verify source chip text content matches i18n
  const sourceChip = page.getByTestId('brief-source-chip-paste');
  await expect(sourceChip).toHaveText(/^(Source: Pasted Text|Fuente: Texto pegado)$/);

  // Verify source persists in brief store
  const briefSource = await page.evaluate(() => {
    return window.useBriefStore?.getState()?.brief?.source;
  });
  expect(briefSource).toBe('paste');
});
