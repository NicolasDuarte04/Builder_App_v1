import { renderHook, act } from '@testing-library/react';
import { useCompareStore } from '../compareStore';
import { ComparedPlan } from '@/types/compare';

// Mock telemetry
jest.mock('@/lib/telemetry', () => ({
  telemetry: {
    track: jest.fn(),
    events: {
      COMPARATOR_OPENED: 'comparator_opened',
      COMPARATOR_ITEM_ADDED: 'comparator_item_added',
      COMPARATOR_ITEM_REMOVED: 'comparator_item_removed',
    }
  },
  getUserContext: jest.fn().mockResolvedValue({ sessionId: 'test-session', userId: 'test-user' })
}));

// Mock data
const createMockPlan = (id: string): ComparedPlan => ({
  id,
  source: { kind: 'catalog', ref: `test-${id}`, updatedAt: '2023-01-01' },
  provider: 'Test Provider',
  name: `Test Plan ${id}`,
  priceCop: 100000,
  priceEstCop: null,
  deductibles: '10%',
  coverages: ['asistencia', 'robo', 'vidrios'],
  exclusions: [],
  waitingTimes: ['24h'],
  fitScore: 85,
  updatedAt: '2023-01-01'
});

describe('compareStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useCompareStore());
    act(() => {
      result.current.clear();
    });
  });

  it('should add items up to max 3', () => {
    const { result } = renderHook(() => useCompareStore());
    
    const plan1 = createMockPlan('1');
    const plan2 = createMockPlan('2');
    const plan3 = createMockPlan('3');
    const plan4 = createMockPlan('4');

    // Add first 3 items
    act(() => {
      result.current.add(plan1);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.count).toBe(1);
    expect(result.current.isEmpty).toBe(false);

    act(() => {
      result.current.add(plan2);
    });
    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.add(plan3);
    });
    expect(result.current.items).toHaveLength(3);
    expect(result.current.isFull).toBe(true);

    // Try to add 4th item - should be ignored
    act(() => {
      result.current.add(plan4);
    });
    expect(result.current.items).toHaveLength(3);
    expect(result.current.items.find(item => item.id === '4')).toBeUndefined();
  });

  it('should deduplicate by id', () => {
    const { result } = renderHook(() => useCompareStore());
    
    const plan1 = createMockPlan('1');
    const plan1Duplicate = { ...createMockPlan('1'), name: 'Different Name' };

    // Add original plan
    act(() => {
      result.current.add(plan1);
    });
    expect(result.current.items).toHaveLength(1);

    // Try to add duplicate - should be ignored
    act(() => {
      result.current.add(plan1Duplicate);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Test Plan 1'); // Original name preserved
  });

  it('should remove items by id', () => {
    const { result } = renderHook(() => useCompareStore());
    
    const plan1 = createMockPlan('1');
    const plan2 = createMockPlan('2');

    // Add items
    act(() => {
      result.current.add(plan1);
      result.current.add(plan2);
    });
    expect(result.current.items).toHaveLength(2);

    // Remove one item
    act(() => {
      result.current.remove('1');
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('2');

    // Remove non-existent item - should not change state
    act(() => {
      result.current.remove('999');
    });
    expect(result.current.items).toHaveLength(1);
  });

  it('should clear all items', () => {
    const { result } = renderHook(() => useCompareStore());
    
    const plan1 = createMockPlan('1');
    const plan2 = createMockPlan('2');

    // Add items
    act(() => {
      result.current.add(plan1);
      result.current.add(plan2);
    });
    expect(result.current.items).toHaveLength(2);

    // Clear all
    act(() => {
      result.current.clear();
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.isFull).toBe(false);
  });

  it('should have correct derived selectors', () => {
    const { result } = renderHook(() => useCompareStore());
    
    // Empty state
    expect(result.current.count).toBe(0);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.isFull).toBe(false);

    // Add one item
    act(() => {
      result.current.add(createMockPlan('1'));
    });
    expect(result.current.count).toBe(1);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.isFull).toBe(false);

    // Add to full capacity
    act(() => {
      result.current.add(createMockPlan('2'));
      result.current.add(createMockPlan('3'));
    });
    expect(result.current.count).toBe(3);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.isFull).toBe(true);
  });

  it('should emit telemetry with sourceKind "template" when adding a template item', async () => {
    const { result } = renderHook(() => useCompareStore());

    const templateItem: ComparedPlan = {
      id: 'tpl_123',
      source: { kind: 'template', ref: 'tpl_123', updatedAt: '2024-01-01T00:00:00Z' },
      provider: undefined,
      name: 'Plantilla Salud',
      priceCop: null,
      priceEstCop: 250000,
      deductibles: null,
      coverages: ['consulta medica', 'hospitalizacion'],
      exclusions: [],
      waitingTimes: [],
      fitScore: 90,
      updatedAt: '2024-01-01T00:00:00Z'
    };

    act(() => {
      result.current.add(templateItem);
    });

    // allow async telemetry call to resolve
    await new Promise((r) => setTimeout(r, 0));

    const { telemetry } = jest.requireMock('@/lib/telemetry');
    expect(telemetry.track).toHaveBeenCalled();
    const lastCall = (telemetry.track as jest.Mock).mock.calls.pop();
    expect(lastCall[0]).toBe(telemetry.events.COMPARATOR_ITEM_ADDED);
    expect(lastCall[1].sourceKind).toBe('template');
    expect(lastCall[1].itemCount).toBe(1);
  });
});
