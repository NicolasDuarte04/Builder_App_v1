/**
 * Defines available actions, permissions, and triggers for the roadmap UI
 */

export type ActionType = 'edit' | 'delete' | 'toggleStatus' | 'assignTool';
export type UserRole = 'admin' | 'user';

export type ActionPermissions = Record<UserRole, ActionType[]>;

export interface ActionTriggers {
  toggleStatus: (status: string) => string;
  [key: string]: (...args: any[]) => any;
}

export const ActionDefinitions = {
  types: ['edit', 'delete', 'toggleStatus', 'assignTool'] as ActionType[],
  permissions: {
    admin: ['edit', 'delete'],
    user: ['toggleStatus', 'assignTool']
  } as ActionPermissions,
  triggers: {
    toggleStatus: (status: string) => status === 'pending' ? 'complete' : 'pending'
  } as ActionTriggers
}; 