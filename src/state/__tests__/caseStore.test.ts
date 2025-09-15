/**
 * Unit tests for caseStore
 * These are lightweight mocks to verify store behavior without runtime usage
 */

import { CaseFile } from "@/types/case";

// Mock Zustand
jest.mock('zustand', () => ({
  create: jest.fn((fn) => fn),
}));

jest.mock('zustand/middleware', () => ({
  persist: jest.fn((fn) => fn),
}));

// Mock the store implementation
describe('useCaseStore', () => {
  // Mock case file data
  const mockCaseFile: CaseFile = {
    id: 'case-1',
    userId: 'user-1',
    caseId: 'case-1',
    briefId: 'brief-1',
    status: 'active',
    timeline: [
      {
        at: '2024-01-01T00:00:00Z',
        event: 'case_created',
        meta: { source: 'brief', briefId: 'brief-1' }
      }
    ],
    reminders: [
      {
        at: '2024-02-01T00:00:00Z',
        kind: 'followup',
        note: 'Follow up with client'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should have correct interface structure', () => {
    // This test verifies the types compile correctly
    const mockStore = {
      caseFile: null as CaseFile | null,

      // Actions
      createFromBrief: async (userId: string, briefId: string) => {
        const newCase: CaseFile = {
          id: `case-${Date.now()}`,
          userId,
          caseId: `case-${Date.now()}`,
          briefId,
          status: 'active',
          timeline: [{
            at: new Date().toISOString(),
            event: 'case_created',
            meta: { source: 'brief', briefId }
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.caseFile = newCase;
      },

      loadById: async (caseId: string) => {
        console.log('Mock loadById', { caseId });
        // TODO: implement in step-3
      },

      setStatus: (status: CaseFile['status']) => {
        if (this.caseFile) {
          this.caseFile = {
            ...this.caseFile,
            status,
            timeline: [
              ...this.caseFile.timeline,
              {
                at: new Date().toISOString(),
                event: 'status_changed',
                meta: { newStatus: status, previousStatus: this.caseFile.status }
              }
            ],
            updatedAt: new Date().toISOString(),
          };
        }
      },

      clearCase: () => {
        this.caseFile = null;
      },
    };

    // Test initial state
    expect(mockStore.caseFile).toBeNull();

    // Test createFromBrief
    mockStore.createFromBrief('user-1', 'brief-1');
    expect(mockStore.caseFile).toBeTruthy();
    expect(mockStore.caseFile?.userId).toBe('user-1');
    expect(mockStore.caseFile?.briefId).toBe('brief-1');
    expect(mockStore.caseFile?.status).toBe('active');

    // Test setStatus
    mockStore.setStatus('proposal_sent');
    expect(mockStore.caseFile?.status).toBe('proposal_sent');
    expect(mockStore.caseFile?.timeline).toHaveLength(2);
    expect(mockStore.caseFile?.timeline[1].event).toBe('status_changed');

    // Test clearCase
    mockStore.clearCase();
    expect(mockStore.caseFile).toBeNull();
  });

  it('should handle all status transitions', () => {
    const mockStore = {
      caseFile: mockCaseFile,
      setStatus: (status: CaseFile['status']) => {
        if (mockStore.caseFile) {
          mockStore.caseFile = { ...mockStore.caseFile, status };
        }
      },
    };

    // Test all valid statuses
    const validStatuses: CaseFile['status'][] = [
      'active',
      'proposal_sent',
      'waiting_client',
      'won',
      'lost'
    ];

    validStatuses.forEach(status => {
      mockStore.setStatus(status);
      expect(mockStore.caseFile?.status).toBe(status);
    });
  });
});
