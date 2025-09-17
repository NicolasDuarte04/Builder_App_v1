import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { BriefPanel } from './BriefPanel';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'es' })
}));
vi.mock('@/state/briefStore', () => ({
  useBriefStore: (sel: any) => sel({
    brief: {
      id: 'b1', userId: 'u', sessionId: 's', locale: 'es', source: 'manual',
      category: null, maxBudgetCop: null, budgetCurrency: 'COP', mustHaveCoverages: [],
      clientPersona: '', notes: '', createdAt: 'now', updatedAt: 'now', version: 1,
      isApplied: false, docRefs: []
    },
    setBrief: vi.fn(), updateBrief: vi.fn(), applyBrief: vi.fn(),
    isSaving: false, isDirty: false, saving: 'idle', lastSavedAt: undefined, authRequired: false,
  })
}));
vi.mock('@/state/uiLayoutStore', () => ({
  useUILayoutStore: (sel: any) => sel({ setBriefCollapsed: vi.fn() })
}));
vi.mock('@/state/compareStore', () => ({
  useCompareStore: (sel: any) => sel({ items: [] })
}));
vi.mock('@/state/proposal', () => ({
  useUiPhase: () => 'welcome'
}));
vi.mock('@/lib/flags', () => ({
  getFFCategoryChooser: () => false
}));
vi.mock('@/lib/telemetry', () => ({
  telemetry: { events: {}, track: vi.fn(), metrics: { countBriefFields: () => ({ fieldsFilled: 0, totalFields: 5, fieldNames: [] }) } },
  getUserContext: async () => ({ sessionId: 's', userId: 'u' })
}));

describe('BriefPanel readOnly and states', () => {
  it('disables all interactive controls when readOnly=true', () => {
    render(<BriefPanel readOnly collapseMode="inplace" />);

    expect(screen.getByTestId('brief-category-select')).toBeDisabled();
    expect(screen.getByTestId('brief-budget-input')).toBeDisabled();
    expect(screen.getByTestId('brief-persona-input')).toBeDisabled();
    expect(screen.getByTestId('brief-notes-input')).toBeDisabled();
    // Search button disabled
    expect(screen.getByTestId('brief-search-button')).toBeDisabled();
  });

  it('renders loading state with aria-busy', () => {
    render(<BriefPanel readOnly testState="loading" collapseMode="inplace" />);
    const el = screen.getByTestId('brief-loading-state');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-busy', 'true');
  });

  it('renders error state with role=alert', () => {
    render(<BriefPanel readOnly testState="error" collapseMode="inplace" />);
    const el = screen.getByTestId('brief-error-state');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'alert');
  });

  it('renders empty state when fields are not filled', () => {
    render(<BriefPanel readOnly testState="empty" collapseMode="inplace" />);
    expect(screen.getByTestId('brief-empty-state')).toBeInTheDocument();
  });
});


