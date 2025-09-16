import { describe, it, expect, vi } from 'vitest';
import { makeLabelResolver } from '@/lib/i18n/labels';

// Mock translation function
const createMockT = (translations: Record<string, string>) => {
  return vi.fn((key: string, options?: any) => {
    if (options?.fallback === undefined && translations[key]) {
      return translations[key];
    }
    return options?.fallback !== undefined ? options.fallback : key;
  });
};

describe('Label Resolver', () => {
  describe('normalizeKey', () => {
    it('should handle various input formats', () => {
      const translations = {
        'labels.fields.price': 'Precio',
        'labels.enums.coverage_types.muerte': 'Fallecimiento',
        'labels.enums.coverage_types.invalidez': 'Invalidez',
      };
      
      const t = createMockT(translations);
      const { fieldLabel, enumLabel } = makeLabelResolver(t);
      
      // Test field normalization
      expect(fieldLabel('price')).toBe('Precio');
      expect(fieldLabel('Price')).toBe('Precio');
      expect(fieldLabel('PRICE')).toBe('Precio');
      expect(fieldLabel('labels.fields.price')).toBe('Precio');
      
      // Test enum normalization
      expect(enumLabel('coverage_types', 'muerte')).toBe('Fallecimiento');
      expect(enumLabel('CoverageTypes', 'muerte')).toBe('Fallecimiento');
      expect(enumLabel('coverage_types', 'CoverageTypes.muerte')).toBe('Fallecimiento');
      expect(enumLabel('coverage_types', 'labels.enums.coverage_types.muerte')).toBe('Fallecimiento');
    });
  });

  describe('fieldLabel', () => {
    it('should resolve field labels with priority hierarchy', () => {
      const translations = {
        'labels.fields.waiting_times': 'Tiempos de espera',
        'labels.deductibles': 'Deducibles (fallback)',
      };
      
      const t = createMockT(translations);
      const { fieldLabel } = makeLabelResolver(t);
      
      // Priority 1: labels.fields.{key}
      expect(fieldLabel('waiting_times')).toBe('Tiempos de espera');
      
      // Priority 2: labels.{key}
      expect(fieldLabel('deductibles')).toBe('Deducibles (fallback)');
      
      // Priority 3: Title case fallback
      expect(fieldLabel('unknown_field')).toBe('Unknown Field');
      expect(fieldLabel('price_per_month')).toBe('Price Per Month');
    });

    it('should handle edge cases gracefully', () => {
      const t = createMockT({});
      const { fieldLabel } = makeLabelResolver(t);
      
      expect(fieldLabel('')).toBe('');
      expect(fieldLabel(null as any)).toBe('');
      expect(fieldLabel(undefined as any)).toBe('');
      expect(fieldLabel(123 as any)).toBe('');
    });

    it('should normalize complex field names', () => {
      const t = createMockT({});
      const { fieldLabel } = makeLabelResolver(t);
      
      expect(fieldLabel('waiting-times')).toBe('Waiting Times');
      expect(fieldLabel('waiting.times')).toBe('Waiting Times');
      expect(fieldLabel('waiting_times')).toBe('Waiting Times');
      expect(fieldLabel('waitingTimes')).toBe('Waiting Times');
      expect(fieldLabel('WaitingTimes')).toBe('Waiting Times');
    });
  });

  describe('enumLabel', () => {
    it('should resolve enum labels with priority hierarchy', () => {
      const translations = {
        'labels.enums.coverage_types.invalidez': 'Invalidez',
        'labels.enums.sources.pdf': 'PDF',
        'labels.robo': 'Robo (fallback)',
      };
      
      const t = createMockT(translations);
      const { enumLabel } = makeLabelResolver(t);
      
      // Priority 1: labels.enums.{kind}.{value}
      expect(enumLabel('coverage_types', 'invalidez')).toBe('Invalidez');
      expect(enumLabel('sources', 'pdf')).toBe('PDF');
      
      // Priority 2: labels.{value}
      expect(enumLabel('coverage_types', 'robo')).toBe('Robo (fallback)');
      
      // Priority 3: Title case fallback
      expect(enumLabel('coverage_types', 'unknown_coverage')).toBe('Unknown Coverage');
    });

    it('should strip various prefix formats', () => {
      const translations = {
        'labels.enums.coverage_types.muerte': 'Fallecimiento',
      };
      
      const t = createMockT(translations);
      const { enumLabel } = makeLabelResolver(t);
      
      // All these should resolve to the same value
      expect(enumLabel('coverage_types', 'muerte')).toBe('Fallecimiento');
      expect(enumLabel('coverage_types', 'CoverageTypes.muerte')).toBe('Fallecimiento');
      expect(enumLabel('coverage_types', 'coverage_types.muerte')).toBe('Fallecimiento');
      expect(enumLabel('coverage_types', 'coverageTypes_muerte')).toBe('Fallecimiento');
      expect(enumLabel('coverage_types', 'labels.enums.coverage_types.muerte')).toBe('Fallecimiento');
    });

    it('should handle edge cases gracefully', () => {
      const t = createMockT({});
      const { enumLabel } = makeLabelResolver(t);
      
      expect(enumLabel('', '')).toBe('');
      expect(enumLabel('coverage_types', '')).toBe('');
      expect(enumLabel('', 'muerte')).toBe('');
      expect(enumLabel(null as any, 'muerte')).toBe('');
      expect(enumLabel('coverage_types', null as any)).toBe('');
      expect(enumLabel(123 as any, 456 as any)).toBe('');
    });

    it('should handle mixed case enum values', () => {
      const translations = {
        'labels.enums.coverage_types.invalidez_total': 'Invalidez Total',
      };
      
      const t = createMockT(translations);
      const { enumLabel } = makeLabelResolver(t);
      
      expect(enumLabel('coverage_types', 'invalidez_total')).toBe('Invalidez Total');
      expect(enumLabel('coverage_types', 'Invalidez_Total')).toBe('Invalidez Total');
      expect(enumLabel('coverage_types', 'INVALIDEZ_TOTAL')).toBe('Invalidez Total');
      expect(enumLabel('coverage_types', 'invalidezTotal')).toBe('Invalidez Total');
    });
  });

  describe('SSR/CSR consistency', () => {
    it('should always return primitive strings', () => {
      const t = createMockT({});
      const { fieldLabel, enumLabel } = makeLabelResolver(t);
      
      // All results should be strings
      expect(typeof fieldLabel('test')).toBe('string');
      expect(typeof enumLabel('kind', 'value')).toBe('string');
      
      // No function references or objects
      const fieldResult = fieldLabel('test');
      const enumResult = enumLabel('kind', 'value');
      
      expect(fieldResult).toBe('Test');
      expect(enumResult).toBe('Value');
      
      // Results should be deterministic
      expect(fieldLabel('test')).toBe(fieldLabel('test'));
      expect(enumLabel('kind', 'value')).toBe(enumLabel('kind', 'value'));
    });

    it('should handle translation function errors gracefully', () => {
      const throwingT = vi.fn(() => {
        throw new Error('Translation error');
      });
      
      const { fieldLabel, enumLabel } = makeLabelResolver(throwingT);
      
      // Should fall back to title case without throwing
      expect(() => fieldLabel('price')).not.toThrow();
      expect(fieldLabel('price')).toBe('Price');
      
      expect(() => enumLabel('coverage_types', 'muerte')).not.toThrow();
      expect(enumLabel('coverage_types', 'muerte')).toBe('Muerte');
    });
  });

  describe('Resolver Decision Table', () => {
    it('should follow documented resolution paths', () => {
      const translations = {
        'labels.fields.price': 'Precio',
        'labels.fields.deductibles': 'Deducibles',
        'labels.enums.coverage_types.muerte': 'Fallecimiento',
        'labels.enums.coverage_types.invalidez': 'Invalidez',
        'labels.enums.sources.catalog': 'Catálogo',
        'labels.assistance': 'Asistencia (fallback)',
      };
      
      const t = createMockT(translations);
      const { fieldLabel, enumLabel } = makeLabelResolver(t);
      
      // Decision table for fields
      const fieldTests = [
        { input: 'price', expected: 'Precio', path: 'labels.fields.price' },
        { input: 'Price', expected: 'Precio', path: 'labels.fields.price (normalized)' },
        { input: 'labels.fields.price', expected: 'Precio', path: 'labels.fields.price (stripped prefix)' },
        { input: 'unknown_field', expected: 'Unknown Field', path: 'Title Case fallback' },
        { input: 'waiting_times', expected: 'Waiting Times', path: 'Title Case fallback' },
      ];
      
      fieldTests.forEach(({ input, expected }) => {
        expect(fieldLabel(input)).toBe(expected);
      });
      
      // Decision table for enums
      const enumTests = [
        { kind: 'coverage_types', value: 'muerte', expected: 'Fallecimiento' },
        { kind: 'CoverageTypes', value: 'muerte', expected: 'Fallecimiento' },
        { kind: 'coverage_types', value: 'CoverageTypes.muerte', expected: 'Fallecimiento' },
        { kind: 'coverage_types', value: 'assistance', expected: 'Asistencia (fallback)' },
        { kind: 'coverage_types', value: 'unknown', expected: 'Unknown' },
        { kind: 'sources', value: 'catalog', expected: 'Catálogo' },
      ];
      
      enumTests.forEach(({ kind, value, expected }) => {
        expect(enumLabel(kind, value)).toBe(expected);
      });
    });
  });
});
