import { describe, it, expect } from 'vitest';
import {
  tickStatesForMustHaves,
  computeCriticalDiffs,
  generateWhyTheseOptions
} from '@/lib/comparison/reasoning';
import type { ComparedPlan } from '@/types/compare';
import type { Brief } from '@/types/brief';

describe('tickStatesForMustHaves', () => {
  it('should return ok for exact matches', () => {
    const mustHaves = ['robo', 'asistencia', 'vidrios'];
    const planCoverages = ['robo', 'asistencia', 'vidrios', 'colision'];
    
    const result = tickStatesForMustHaves(mustHaves, planCoverages);
    expect(result).toEqual(['ok', 'ok', 'ok']);
  });
  
  it('should handle synonym matches (cristales → vidrios)', () => {
    const mustHaves = ['vidrios'];
    const planCoverages = ['cristales', 'robo'];
    
    const result = tickStatesForMustHaves(mustHaves, planCoverages);
    expect(result).toEqual(['ok']);
  });
  
  it('should return miss for missing coverages', () => {
    const mustHaves = ['robo', 'asistencia', 'vidrios'];
    const planCoverages = ['robo'];
    
    const result = tickStatesForMustHaves(mustHaves, planCoverages);
    expect(result).toEqual(['ok', 'miss', 'miss']);
  });
  
  it('should handle empty arrays', () => {
    expect(tickStatesForMustHaves([], ['robo'])).toEqual([]);
    expect(tickStatesForMustHaves(['robo'], [])).toEqual(['miss']);
  });
  
  it('should normalize coverage names', () => {
    const mustHaves = ['ROBO', 'Asistencia 24/7', 'Cristales'];
    const planCoverages = ['robo', 'auxilio mecanico', 'parabrisas'];
    
    const result = tickStatesForMustHaves(mustHaves, planCoverages);
    expect(result).toEqual(['ok', 'ok', 'ok']);
  });
});

describe('computeCriticalDiffs', () => {
  const baseBrief: Brief = {
    id: '1',
    userId: 'user1',
    sessionId: 'session1',
    locale: 'es',
    source: 'manual',
    category: 'Vehículos',
    maxBudgetCop: 500000,
    mustHaveCoverages: ['robo', 'asistencia'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    version: 1,
    isApplied: true
  };
  
  const basePlan: ComparedPlan = {
    id: '1',
    source: { kind: 'catalog', ref: 'plan1' },
    provider: 'Sura',
    name: 'Plan Básico',
    priceCop: 300000,
    coverages: ['robo', 'asistencia'],
    fitScore: 80
  };
  
  it('should return exactly 3 bullets', () => {
    const items = [basePlan, { ...basePlan, id: '2', priceCop: 400000 }];
    const result = computeCriticalDiffs(items, baseBrief);
    
    expect(result).toHaveLength(3);
    expect(result.every(r => r.length <= 120)).toBe(true);
  });
  
  it('should detect budget overruns', () => {
    const items = [
      basePlan,
      { ...basePlan, id: '2', priceCop: 600000 },
      { ...basePlan, id: '3', priceCop: 700000 }
    ];
    
    const result = computeCriticalDiffs(items, baseBrief);
    expect(result[0]).toContain('2 de 3 exceden presupuesto');
  });
  
  it('should show price variance with estimated prices', () => {
    const items = [
      { ...basePlan, priceCop: null, priceEstCop: 200000 },
      { ...basePlan, id: '2', priceCop: 400000 }
    ];
    
    const result = computeCriticalDiffs(items, baseBrief);
    expect(result[0]).toMatch(/100%.*\(est\.\)/);
  });
  
  it('should detect missing must-have coverages', () => {
    const items = [
      basePlan,
      { ...basePlan, id: '2', coverages: ['colision'] }
    ];
    
    const result = computeCriticalDiffs(items, baseBrief);
    expect(result.find(r => r.includes('sin: robo, asistencia'))).toBeTruthy();
  });
  
  it('should detect high deductibles on robo', () => {
    const items = [
      basePlan,
      { ...basePlan, id: '2', deductibles: 'Robo: 30% del valor' }
    ];
    
    const result = computeCriticalDiffs(items, baseBrief);
    expect(result.find(r => r.includes('Alto deducible en robo'))).toBeTruthy();
  });
  
  it('should handle empty exclusions gracefully', () => {
    const items = [
      { ...basePlan, exclusions: [] },
      { ...basePlan, id: '2', exclusions: undefined }
    ];
    
    const result = computeCriticalDiffs(items, baseBrief);
    expect(result.every(r => !r.includes('exclusiones'))).toBe(true);
  });
  
  it('should handle single plan gracefully', () => {
    const result = computeCriticalDiffs([basePlan], baseBrief);
    expect(result[0]).toBe('Necesita al menos 2 planes para comparar');
    expect(result[1]).toBe('');
    expect(result[2]).toBe('');
  });
});

describe('generateWhyTheseOptions', () => {
  const baseBrief: Brief = {
    id: '1',
    userId: 'user1',
    sessionId: 'session1',
    locale: 'es',
    source: 'manual',
    category: 'Vehículos',
    maxBudgetCop: 500000,
    mustHaveCoverages: ['robo', 'asistencia', 'vidrios'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    version: 1,
    isApplied: true
  };
  
  const basePlan: ComparedPlan = {
    id: '1',
    source: { kind: 'catalog', ref: 'plan1' },
    provider: 'Sura',
    name: 'Plan Completo',
    priceCop: 400000,
    coverages: ['robo', 'asistencia', 'vidrios'],
    fitScore: 90
  };
  
  it('should generate broker-friendly paragraph with category and budget', () => {
    const items = [basePlan, { ...basePlan, id: '2', priceCop: 450000 }];
    const result = generateWhyTheseOptions(items, baseBrief);
    
    expect(result).toContain('Comparando 2 opciones de seguro vehículos');
    expect(result).toMatch(/\$\s*500\.000/);
    expect(result).toContain('todas dentro del presupuesto');
  });
  
  it('should mention must-have coverage matches', () => {
    const items = [basePlan];
    const result = generateWhyTheseOptions(items, baseBrief);
    
    expect(result).toContain('con las coberturas solicitadas (robo, asistencia...)');
  });
  
  it('should add disclaimer for non-catalog sources', () => {
    const items = [
      basePlan,
      { ...basePlan, id: '2', source: { kind: 'pdf', ref: 'doc.pdf' } },
      { ...basePlan, id: '3', source: { kind: 'template', ref: 'template1' } }
    ];
    
    const result = generateWhyTheseOptions(items, baseBrief);
    expect(result).toContain('Nota: algunos datos provienen de documentos externos');
  });
  
  it('should handle mixed budget compliance', () => {
    const items = [
      basePlan,
      { ...basePlan, id: '2', priceCop: 600000 }
    ];
    
    const result = generateWhyTheseOptions(items, baseBrief);
    expect(result).toContain('1 se ajustan al presupuesto');
  });
  
  it('should handle no category gracefully', () => {
    const briefNoCategory = { ...baseBrief, category: null };
    const result = generateWhyTheseOptions([basePlan], briefNoCategory);
    
    expect(result).toContain('Comparando 1 opciones de seguro,');
    expect(result).not.toContain('vehículos');
  });
  
  it('should handle empty items array', () => {
    const result = generateWhyTheseOptions([], baseBrief);
    expect(result).toBe('No se encontraron opciones para comparar.');
  });
  
  it('should format COP currency correctly', () => {
    const briefHighBudget = { ...baseBrief, maxBudgetCop: 1500000 };
    const result = generateWhyTheseOptions([basePlan], briefHighBudget);
    
    expect(result).toMatch(/\$\s*1\.500\.000/);
  });
});
