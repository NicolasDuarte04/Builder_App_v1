import { test, expect } from '@playwright/test';

test.describe('Brief reparse functionality', () => {
  test('shows merge/replace dialog when pasting with existing brief', async ({ page }) => {
    // Start with a clean state
    await page.goto('/?e2e=1');

    // First paste - should go through without dialog
    const initialText = 'Cliente busca seguro de auto con presupuesto de 200000 pesos mensuales';
    await page.getByTestId('chat-input').click();
    await page.keyboard.insertText(initialText);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+C');
    await page.keyboard.press('Control+V');
    
    // Wait for and click extract chip
    await page.getByTestId('extract-brief-chip-confirm').click();
    
    // Wait for brief to be populated
    await expect(page.getByText('auto')).toBeVisible();
    await expect(page.getByText('200000')).toBeVisible();

    // Second paste - should trigger dialog
    const newText = 'Necesita seguro de vida, máximo 300000 al mes, debe incluir muerte accidental';
    await page.getByTestId('chat-input').click();
    await page.keyboard.insertText(newText);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+C');
    await page.keyboard.press('Control+V');
    
    // Click extract and verify dialog appears
    await page.getByTestId('extract-brief-chip-confirm').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('reparse-merge-btn')).toBeVisible();
    await expect(page.getByTestId('reparse-replace-btn')).toBeVisible();
  });

  test('merge action preserves existing fields', async ({ page }) => {
    await page.goto('/?e2e=1');

    // Initial auto insurance brief
    const autoText = 'Cliente busca seguro de auto con presupuesto de 200000 pesos mensuales';
    await page.getByTestId('chat-input').click();
    await page.keyboard.insertText(autoText);
    await page.keyboard.press('Control+V');
    await page.getByTestId('extract-brief-chip-confirm').click();
    
    // Wait for initial brief
    await expect(page.getByText('auto')).toBeVisible();
    await expect(page.getByText('200000')).toBeVisible();

    // Add life insurance text
    const lifeText = 'Necesita seguro de vida, máximo 300000 al mes, debe incluir muerte accidental';
    await page.getByTestId('chat-input').click();
    await page.keyboard.insertText(lifeText);
    await page.keyboard.press('Control+V');
    await page.getByTestId('extract-brief-chip-confirm').click();

    // Choose merge
    await page.getByTestId('reparse-merge-btn').click();

    // Verify both fields are present
    await expect(page.getByText('auto')).toBeVisible();
    await expect(page.getByText('200000')).toBeVisible();
    await expect(page.getByText('muerte accidental')).toBeVisible();
  });

  test('replace action overwrites existing fields', async ({ page }) => {
    await page.goto('/?e2e=1');

    // Initial auto insurance brief
    const autoText = 'Cliente busca seguro de auto con presupuesto de 200000 pesos mensuales';
    await page.getByTestId('chat-input').click();
    await page.keyboard.insertText(autoText);
    await page.keyboard.press('Control+V');
    await page.getByTestId('extract-brief-chip-confirm').click();
    
    // Wait for initial brief
    await expect(page.getByText('auto')).toBeVisible();
    await expect(page.getByText('200000')).toBeVisible();

    // Add life insurance text
    const lifeText = 'Necesita seguro de vida, máximo 300000 al mes, debe incluir muerte accidental';
    await page.getByTestId('chat-input').click();
    await page.keyboard.insertText(lifeText);
    await page.keyboard.press('Control+V');
    await page.getByTestId('extract-brief-chip-confirm').click();

    // Choose replace
    await page.getByTestId('reparse-replace-btn').click();

    // Verify only new fields are present
    await expect(page.getByText('vida')).toBeVisible();
    await expect(page.getByText('300000')).toBeVisible();
    await expect(page.getByText('muerte accidental')).toBeVisible();
    await expect(page.getByText('auto')).not.toBeVisible();
    await expect(page.getByText('200000')).not.toBeVisible();
  });
});
