import { describe, it, expect } from 'vitest';
import { makeLabelResolver } from '@/lib/i18n/labels';

type Dict = Record<string, string>;

const createMockT = (dict: Dict) =>
  (key: string, values?: { fallback?: unknown }): string | undefined => {
    if (key in dict) return dict[key];
    if (values && 'fallback' in values) return values.fallback as any;
    return key;
  };

describe('labels resolver', () => {
  const esDict: Dict = {
    'labels.enums.coverage_types.muerte': 'Fallecimiento',
    'labels.enums.coverage_types.auxilio_funerario': 'Auxilio funerario',
    'labels.enums.coverage_types.invalidez': 'Invalidez',
    'labels.fields.waiting_times': 'Tiempos de espera',
    'labels.fields.exclusions': 'Exclusiones',
  };

  const enDict: Dict = {
    'labels.enums.coverage_types.muerte': 'Death coverage',
    'labels.enums.coverage_types.auxilio_funerario': 'Funeral assistance',
    'labels.enums.coverage_types.invalidez': 'Disability',
    'labels.fields.waiting_times': 'Waiting times',
    'labels.fields.exclusions': 'Exclusions',
  };

  describe('enumLabel - fallback and prefix stripping', () => {
    it('returns Title-Case for sources when dictionary is missing (with prefix)', () => {
      const t = createMockT({});
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('sources', 'sources.catalog')).toBe('Catalog');
    });

    it('returns Title-Case for sources when dictionary is missing (no prefix)', () => {
      const t = createMockT({});
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('sources', 'catalog')).toBe('Catalog');
    });

    it('strips kind prefix and resolves ES translation for coverage types (muerte)', () => {
      const t = createMockT(esDict);
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('coverage_types', 'CoverageTypes.muerte')).toBe('Fallecimiento');
    });

    it('normalizes camelCase kind and value for ES (auxilioFunerario)', () => {
      const t = createMockT(esDict);
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('coverageTypes', 'auxilioFunerario')).toBe('Auxilio funerario');
    });

    it('strips kind prefix and resolves EN translation for coverage types (muerte)', () => {
      const t = createMockT(enDict);
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('coverage_types', 'CoverageTypes.muerte')).toBe('Death coverage');
    });

    it('normalizes camelCase kind and value for EN (auxilioFunerario)', () => {
      const t = createMockT(enDict);
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('coverageTypes', 'auxilioFunerario')).toBe('Funeral assistance');
    });

    it('resolves ES translation for invalidez', () => {
      const t = createMockT(esDict);
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('coverage_types', 'invalidez')).toBe('Invalidez');
    });

    it('resolves EN translation for invalidez', () => {
      const t = createMockT(enDict);
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('coverage_types', 'invalidez')).toBe('Disability');
    });

    it('accepts dotted enum paths like labels.enums.coverage_types.invalidez', () => {
      const t = createMockT(enDict);
      const { enumLabel } = makeLabelResolver(t as any);
      expect(enumLabel('coverage_types', 'labels.enums.coverage_types.invalidez')).toBe('Disability');
    });
  });

  describe('fieldLabel - dictionary and fallback', () => {
    it('resolves ES field labels from dictionary', () => {
      const t = createMockT(esDict);
      const { fieldLabel } = makeLabelResolver(t as any);
      expect(fieldLabel('waitingTimes')).toBe('Tiempos de espera');
      expect(fieldLabel('exclusions')).toBe('Exclusiones');
    });

    it('resolves EN field labels from dictionary', () => {
      const t = createMockT(enDict);
      const { fieldLabel } = makeLabelResolver(t as any);
      expect(fieldLabel('waitingTimes')).toBe('Waiting times');
      expect(fieldLabel('exclusions')).toBe('Exclusions');
    });

    it('falls back to Title-Case when dictionary entries are absent', () => {
      const t = createMockT({});
      const { fieldLabel } = makeLabelResolver(t as any);
      expect(fieldLabel('customUnknownField')).toBe('Custom Unknown Field');
    });
  });
});


