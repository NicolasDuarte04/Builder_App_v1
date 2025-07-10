import { TaskAction, TaskStatus, ToolReference, ActionType } from '@/types/roadmap';
import { BrikiTool, getToolInfo } from '@/lib/tool-mapping';

// Action payload types
export interface BaseActionPayload {
  taskId: string;
  phaseId: string;
}

export interface LaunchFeaturePayload extends BaseActionPayload {
  featureId: string;
  config?: Record<string, unknown>;
}

export interface ShowComponentPayload extends BaseActionPayload {
  componentId: string;
  props?: Record<string, unknown>;
}

export interface TriggerAgentPayload extends BaseActionPayload {
  agentId: string;
  input?: Record<string, unknown>;
}

export interface OpenToolPayload extends BaseActionPayload {
  toolId: string;
  context?: string;
  features?: string[];
}

export interface MarkCompletePayload extends BaseActionPayload {
  status: TaskStatus;
  metadata?: Record<string, unknown>;
}

export interface RequestHelpPayload extends BaseActionPayload {
  issue: string;
  priority: 'low' | 'medium' | 'high';
  context?: Record<string, unknown>;
}

// Helper function to convert payload to Record<string, unknown>
function toRecord<T extends Record<string, any>>(payload: T): Record<string, unknown> {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, unknown>);
}

// Action creators
export function createLaunchFeatureAction(
  payload: LaunchFeaturePayload
): TaskAction {
  return {
    type: 'launch-feature',
    payload: toRecord(payload),
    conditions: {
      requiredStatus: ['in-progress', 'need-help']
    }
  };
}

export function createShowComponentAction(
  payload: ShowComponentPayload
): TaskAction {
  return {
    type: 'show-component',
    payload: toRecord(payload),
    conditions: {}
  };
}

export function createTriggerAgentAction(
  payload: TriggerAgentPayload
): TaskAction {
  return {
    type: 'trigger-agent',
    payload: toRecord(payload),
    conditions: {
      requiredStatus: ['in-progress', 'need-help']
    }
  };
}

export function createOpenToolAction(
  payload: OpenToolPayload
): TaskAction {
  return {
    type: 'open-tool',
    payload: toRecord(payload),
    conditions: {
      requiredTools: [payload.toolId]
    }
  };
}

export function createMarkCompleteAction(
  payload: MarkCompletePayload
): TaskAction {
  return {
    type: 'mark-complete',
    payload: toRecord(payload),
    conditions: {
      requiredStatus: ['in-progress']
    }
  };
}

export function createRequestHelpAction(
  payload: RequestHelpPayload
): TaskAction {
  return {
    type: 'request-help',
    payload: toRecord(payload),
    conditions: {}
  };
}

// Action handlers
export async function handleTaskAction(
  action: TaskAction,
  tools?: ToolReference[]
): Promise<void> {
  try {
    switch (action.type) {
      case 'launch-feature': {
        const payload = action.payload as unknown as LaunchFeaturePayload;
        // TODO: Implement feature launch logic
        console.log('Launching feature:', payload.featureId);
        break;
      }

      case 'show-component': {
        const payload = action.payload as unknown as ShowComponentPayload;
        // TODO: Implement component display logic
        console.log('Showing component:', payload.componentId);
        break;
      }

      case 'trigger-agent': {
        const payload = action.payload as unknown as TriggerAgentPayload;
        // TODO: Implement agent trigger logic
        console.log('Triggering agent:', payload.agentId);
        break;
      }

      case 'open-tool': {
        const payload = action.payload as unknown as OpenToolPayload;
        const tool = await getToolInfo(payload.toolId);
        if (tool) {
          // Open tool URL with context
          window.open(tool.url, '_blank');
        }
        break;
      }

      case 'mark-complete': {
        const payload = action.payload as unknown as MarkCompletePayload;
        // TODO: Implement status update logic
        console.log('Marking task complete:', payload.taskId);
        break;
      }

      case 'request-help': {
        const payload = action.payload as unknown as RequestHelpPayload;
        // TODO: Implement help request logic
        console.log('Requesting help:', payload.issue);
        break;
      }

      case 'custom': {
        // Handle custom actions
        console.log('Custom action:', action.payload);
        break;
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    console.error('Error handling task action:', error);
    throw error;
  }
}

// Action validation
export function validateActionConditions(
  action: TaskAction,
  currentStatus: TaskStatus,
  availableTools: ToolReference[]
): boolean {
  const { conditions } = action;
  
  if (!conditions) return true;

  // Check status requirements
  if (conditions.requiredStatus && 
      !conditions.requiredStatus.includes(currentStatus)) {
    return false;
  }

  // Check tool requirements
  if (conditions.requiredTools && conditions.requiredTools.length > 0) {
    const hasTools = conditions.requiredTools.every(toolId =>
      availableTools.some(tool => tool.toolId === toolId)
    );
    if (!hasTools) return false;
  }

  // Check custom conditions
  if (conditions.customCheck) {
    try {
      // TODO: Implement custom condition checking
      return true;
    } catch (error) {
      console.error('Error checking custom conditions:', error);
      return false;
    }
  }

  return true;
}

// Generate actions for a task based on context
export function generateTaskActions(
  taskId: string,
  phaseId: string,
  tools: ToolReference[]
): TaskAction[] {
  const actions: TaskAction[] = [];

  // Add tool actions
  tools.forEach(tool => {
    actions.push(createOpenToolAction({
      taskId,
      phaseId,
      toolId: tool.toolId,
      context: tool.context,
      features: tool.requiredFeatures
    }));
  });

  // Add standard actions
  actions.push(
    createMarkCompleteAction({
      taskId,
      phaseId,
      status: 'completed'
    }),
    createRequestHelpAction({
      taskId,
      phaseId,
      issue: 'Need assistance with task',
      priority: 'medium'
    })
  );

  return actions;
} 