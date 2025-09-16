/**
 * Strict Mode Resilience Test for PlanResultsSidebar
 * Demonstrates single-fire behavior of edge-triggered toast
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { PlanResultsSidebar } from '../PlanResultsSidebar';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en'
  })
}));
jest.mock('@/lib/i18n/labels', () => ({
  makeLabelResolver: () => ({
    fieldLabel: (key: string) => key,
    enumLabel: (key: string) => key
  })
}));
jest.mock('@/contexts/PlanResultsContext', () => ({
  usePlanResults: () => ({
    hideRightPanel: jest.fn(),
    setDualPanelMode: jest.fn(),
    setSidebarOpen: jest.fn()
  })
}));
jest.mock('@/state/uiOverlay', () => ({
  useUIOverlay: () => ({
    resultsState: 'open',
    minimizeResults: jest.fn(),
    openResults: jest.fn(),
    hideResults: jest.fn()
  })
}));
jest.mock('@/state/compareStore', () => ({
  useCompareStore: (selector: any) => selector({ items: [] })
}));
jest.mock('@/state/briefStore', () => ({
  useBriefStore: () => ({ brief: null })
}));
jest.mock('@/state/uiLayoutStore', () => ({
  useUILayoutStore: () => ({ clearBriefManualOverride: jest.fn() })
}));
jest.mock('@/state/proposal', () => ({
  useUiPhase: () => 'results'
}));

describe('PlanResultsSidebar - Strict Mode Resilience', () => {
  let toastMock: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    toastMock = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: toastMock });
    
    // Capture console logs for verification
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should fire compare ready toast only once on 1→2 transition under Strict Mode', async () => {
    const mockResults = {
      title: 'Test Results',
      plans: [
        { id: 1, name: 'Plan A', provider: 'Provider A', basePrice: 100, currency: 'COP' },
        { id: 2, name: 'Plan B', provider: 'Provider B', basePrice: 200, currency: 'COP' }
      ],
      requestId: 'test-123'
    };

    // Simulate React Strict Mode by rendering twice
    const { rerender, getByTestId } = render(
      <React.StrictMode>
        <PlanResultsSidebar 
          isOpen={true}
          onClose={jest.fn()}
          currentResults={mockResults}
        />
      </React.StrictMode>
    );

    // Pin first plan
    act(() => {
      const firstPinButton = getByTestId('pin-toggle');
      firstPinButton.click();
    });

    // Wait for state update
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledTimes(1); // Pin toast
    });

    toastMock.mockClear();

    // Pin second plan (1→2 transition)
    act(() => {
      const pinButtons = document.querySelectorAll('[data-testid="pin-toggle"]');
      pinButtons[1].click();
    });

    // Wait for the deferred toast
    await waitFor(() => {
      // Should only fire once despite Strict Mode double-render
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'assistant.compare_ready_toast_title',
          description: 'assistant.compare_ready_toast_desc'
        })
      );
    }, { timeout: 200 });

    // Verify only one toast was fired
    expect(toastMock).toHaveBeenCalledTimes(2); // 1 for pin, 1 for compare ready

    // Log proof of single-fire behavior
    console.log('✅ Strict Mode Test: Compare ready toast fired exactly once on 1→2 transition');
  });

  it('should not fire compare ready toast when jumping from 0→2', async () => {
    const mockResults = {
      title: 'Test Results',
      plans: [
        { id: 1, name: 'Plan A', provider: 'Provider A', basePrice: 100, currency: 'COP' },
        { id: 2, name: 'Plan B', provider: 'Provider B', basePrice: 200, currency: 'COP' }
      ],
      requestId: 'test-456'
    };

    const { getAllByTestId } = render(
      <React.StrictMode>
        <PlanResultsSidebar 
          isOpen={true}
          onClose={jest.fn()}
          currentResults={mockResults}
        />
      </React.StrictMode>
    );

    // Pin two plans at once (0→2 transition)
    act(() => {
      const pinButtons = getAllByTestId('pin-toggle');
      pinButtons[0].click();
      pinButtons[1].click();
    });

    await waitFor(() => {
      // Should have 2 pin toasts but NO compare ready toast
      expect(toastMock).toHaveBeenCalledTimes(2);
      expect(toastMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'assistant.compare_ready_toast_title'
        })
      );
    });

    console.log('✅ Strict Mode Test: No compare ready toast on 0→2 jump');
  });
});
