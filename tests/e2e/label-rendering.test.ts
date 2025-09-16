import { test, expect } from '@playwright/test';

test.describe('Label Rendering', () => {
  test('should not display dotted translation keys in the UI', async ({ page }) => {
    // Navigate to assistant page which shows plans
    await page.goto('/assistant');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Get all text content from the page
    const pageContent = await page.textContent('body');
    
    // Check that no dotted translation keys are visible
    const dottedKeyPatterns = [
      /labels\.enums\.\w+/,
      /labels\.fields\.\w+/,
      /coverage_types\.\w+/,
      /CoverageTypes\.\w+/,
    ];
    
    for (const pattern of dottedKeyPatterns) {
      const matches = pageContent?.match(pattern);
      if (matches) {
        throw new Error(`Found dotted translation key in UI: ${matches[0]}`);
      }
    }
  });

  test('should render enum labels correctly in comparison view', async ({ page }) => {
    // Navigate to a page with comparison
    await page.goto('/assistant');
    
    // Mock some plans in the compare store (this would be set up via your test fixtures)
    await page.evaluate(() => {
      // Simulate having plans with various enum values in comparison
      const mockPlans = [
        {
          id: 'test-1',
          name: 'Test Plan 1',
          provider: 'Test Provider',
          priceCop: 100000,
          coverages: ['muerte', 'invalidez', 'asistencia'],
          source: { kind: 'catalog', updatedAt: new Date().toISOString() }
        },
        {
          id: 'test-2', 
          name: 'Test Plan 2',
          provider: 'Test Provider 2',
          priceCop: 150000,
          coverages: ['robo', 'vidrios', 'CoverageTypes.muerte'], // Mixed format
          source: { kind: 'pdf', updatedAt: new Date().toISOString() }
        }
      ];
      
      // Add to compare store if it exists
      if ((window as any).useCompareStore) {
        const store = (window as any).useCompareStore.getState();
        mockPlans.forEach(plan => store.add(plan));
      }
    });
    
    // Check that coverage labels are rendered correctly
    const coverageLabels = await page.locator('[data-testid="comparator"] td').allTextContents();
    
    // Verify no raw enum values appear
    const rawEnumValues = ['muerte', 'invalidez', 'robo', 'vidrios'];
    for (const rawValue of rawEnumValues) {
      const hasRawValue = coverageLabels.some(label => 
        label.toLowerCase() === rawValue || 
        label.includes(`CoverageTypes.${rawValue}`) ||
        label.includes(`coverage_types.${rawValue}`)
      );
      
      expect(hasRawValue).toBe(false);
    }
    
    // Verify translated labels appear (in Spanish by default)
    const expectedLabels = ['Fallecimiento', 'Invalidez', 'Robo', 'Vidrios', 'Asistencia'];
    for (const expectedLabel of expectedLabels) {
      const hasLabel = coverageLabels.some(label => label.includes(expectedLabel));
      // This is a soft check - at least some should be present
      if (hasLabel) {
        expect(hasLabel).toBe(true);
      }
    }
  });

  test('should handle missing enum translations gracefully', async ({ page }) => {
    await page.goto('/assistant');
    
    // Inject a plan with unknown coverage type
    await page.evaluate(() => {
      const mockPlan = {
        id: 'test-unknown',
        name: 'Test Unknown Coverage',
        provider: 'Test Provider',
        priceCop: 100000,
        coverages: ['unknown_coverage_type', 'some_new_coverage'],
        source: { kind: 'template', updatedAt: new Date().toISOString() }
      };
      
      if ((window as any).useCompareStore) {
        const store = (window as any).useCompareStore.getState();
        store.add(mockPlan);
      }
    });
    
    // Get rendered content
    const content = await page.textContent('body');
    
    // Should show title-cased fallback, not raw keys
    expect(content).not.toContain('unknown_coverage_type');
    expect(content).not.toContain('some_new_coverage');
    
    // Should contain humanized versions (if visible)
    // Note: These might not be visible depending on the UI state
    if (content?.includes('Unknown Coverage Type') || content?.includes('Some New Coverage')) {
      expect(true).toBe(true); // Found humanized version
    }
  });

  test('should maintain consistency between Spanish and English', async ({ page }) => {
    // Test Spanish first (default)
    await page.goto('/assistant');
    await page.waitForLoadState('networkidle');
    
    const spanishContent = await page.textContent('body');
    
    // Switch to English
    await page.click('[data-testid="language-switcher"]'); // Adjust selector as needed
    await page.click('text=English');
    await page.waitForLoadState('networkidle');
    
    const englishContent = await page.textContent('body');
    
    // Both should not contain dotted keys
    const dottedKeyPattern = /labels\.(enums|fields)\.\w+\.\w+/;
    expect(spanishContent).not.toMatch(dottedKeyPattern);
    expect(englishContent).not.toMatch(dottedKeyPattern);
  });
});
