/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { pickBriefWhitelist } from '@/lib/briefWhitelist';
import { useBriefStore } from '@/state/briefStore';
import type { Brief } from '@/types/brief';

describe('pickBriefWhitelist', () => {
  it('solo devuelve campos permitidos', () => {
    const noisy: any = {
      category: 'Salud',
      maxBudgetCop: 1500000,
      mustHaveCoverages: ['hospitalización', 'ambulancia'],
      clientPersona: 'familia',
      notes: 'cobertura amplia',
      docRefs: [{ type: 'pdf', ref: 'abc.pdf' }],
      // no permitidos
      id: 'hack',
      userId: 'x',
      sessionId: 'y',
      budgetCurrency: 'USD',
      rawText: 'texto crudo',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-02',
      version: 99,
      isApplied: true,
      randomField: 123,
    };

    const picked = pickBriefWhitelist(noisy);
    expect(Object.keys(picked).sort()).toEqual([
      'category',
      'clientPersona',
      'docRefs',
      'maxBudgetCop',
      'mustHaveCoverages',
      'notes',
    ].sort());
  });
});

describe('integración: whitelist antes de updateBrief', () => {
  beforeEach(() => {
    // Reset store entre tests
    try { useBriefStore.getState().clearBrief(); } catch {}
  });

  it('aplica solo campos whitelisted al store', () => {
    const nowIso = new Date().toISOString();
    const initial: Brief = {
      id: 'brief-1',
      userId: 'user-1',
      sessionId: 'sess-1',
      locale: 'es',
      source: 'manual',
      category: null,
      maxBudgetCop: null,
      mustHaveCoverages: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
      isApplied: false,
    };

    useBriefStore.getState().setBrief(initial);

    const noisyPatch: any = {
      category: 'Vida',
      maxBudgetCop: 2000000,
      mustHaveCoverages: ['fallecimiento'],
      clientPersona: 'padre de familia',
      notes: 'priorizar educación',
      docRefs: [{ type: 'url', ref: 'https://example.com/poliza' }],
      // ruidos
      id: 'otro',
      userId: 'mal',
      sessionId: 'mal2',
      rawText: 'debería ignorarse',
      randomNope: true,
    };

    const whitelisted = pickBriefWhitelist(noisyPatch);
    useBriefStore.getState().updateBrief(whitelisted, { field: 'category' });

    const b = useBriefStore.getState().brief!;

    // Cambios esperados
    expect(b.category).toBe('Vida');
    expect(b.maxBudgetCop).toBe(2000000);
    expect(b.mustHaveCoverages).toEqual(['fallecimiento']);
    expect(b.clientPersona).toBe('padre de familia');
    expect(b.notes).toBe('priorizar educación');
    expect(b.docRefs).toEqual([{ type: 'url', ref: 'https://example.com/poliza' }]);

    // Campos no permitidos no deben haberse introducido ni modificado
    expect((b as any).randomNope).toBeUndefined();
    expect((b as any).rawText).toBeUndefined();
    expect(b.id).toBe('brief-1');
    expect(b.userId).toBe('user-1');
    expect(b.sessionId).toBe('sess-1');
  });
});


