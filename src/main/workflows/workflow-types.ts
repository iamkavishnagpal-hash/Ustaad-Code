import { z } from 'zod';

export type TriggerType = 'hotkey' | 'manual';

export interface WorkflowTrigger {
  type: TriggerType;
  hotkey?: string;
}

export type ConditionType = 'active-application' | 'window-title' | 'workspace-state';
export type ConditionOperator = 'equals' | 'contains' | 'not-equals';

export interface WorkflowCondition {
  type: ConditionType;
  operator: ConditionOperator;
  value: string;
}

export type PermissionLevel = 'SAFE' | 'USER_CONFIRMATION' | 'RESTRICTED';

export type ActionType =
  | 'OPEN_URL'
  | 'OPEN_APPLICATION'
  | 'SHOW_OVERLAY'
  | 'HIDE_OVERLAY'
  | 'START_CONTEXT'
  | 'STOP_CONTEXT'
  | 'REQUEST_AI_RESPONSE'
  | 'OPEN_VSCODE'
  | 'FOCUS_VSCODE'
  | 'OPEN_VSCODE_FOLDER'
  | 'OPEN_VSCODE_FILE'
  | 'OPEN_TERMINAL'
  | 'FOCUS_TERMINAL'
  | 'GET_GIT_STATUS'
  | 'GET_GIT_CURRENT_BRANCH'
  | 'GET_GIT_DIFF';

export interface WorkflowStep {
  id: string;
  actionType: ActionType;
  parameters: Record<string, any>;
  permissionLevel: PermissionLevel;
  timeoutMs?: number;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export type WorkflowStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ActionExecutionContext {
  workspaceId: string;
  sessionId?: string;
  activeApplication?: string;
  variables: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  output?: any;
  error?: string;
}

export interface ActionValidationResult {
  valid: boolean;
  errors: string[];
}
