/**
 * Defines allowed transitions between task statuses
 */

export type TaskStatus = 'pending' | 'inProgress' | 'complete' | 'blocked';

export interface StatusTransition {
  from: TaskStatus;
  to: TaskStatus[];
}

export const StatusTransitionRules: StatusTransition[] = [
  { from: 'pending', to: ['inProgress', 'complete'] },
  { from: 'inProgress', to: ['complete', 'blocked'] },
  { from: 'complete', to: [] }
] as const; 