import { z } from 'zod';
import { Workflow } from './workflow-types';

export const WorkflowTriggerSchema = z.object({
  type: z.enum(['hotkey', 'manual']),
  hotkey: z.string().optional(),
});

export const WorkflowConditionSchema = z.object({
  type: z.enum(['active-application', 'window-title', 'workspace-state']),
  operator: z.enum(['equals', 'contains', 'not-equals']),
  value: z.string(),
});

export const WorkflowStepSchema = z.object({
  id: z.string().min(1),
  actionType: z.enum([
    'OPEN_URL',
    'OPEN_APPLICATION',
    'SHOW_OVERLAY',
    'HIDE_OVERLAY',
    'START_CONTEXT',
    'STOP_CONTEXT',
    'REQUEST_AI_RESPONSE',
    'OPEN_VSCODE',
    'FOCUS_VSCODE',
    'OPEN_VSCODE_FOLDER',
    'OPEN_VSCODE_FILE',
    'OPEN_TERMINAL',
    'FOCUS_TERMINAL',
    'GET_GIT_STATUS',
    'GET_GIT_CURRENT_BRANCH',
    'GET_GIT_DIFF',
  ]),
  parameters: z.record(z.any()).default({}),
  permissionLevel: z.enum(['SAFE', 'USER_CONFIRMATION', 'RESTRICTED']).default('SAFE'),
  timeoutMs: z.number().positive().optional(),
});

export const WorkflowSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  trigger: WorkflowTriggerSchema,
  conditions: z.array(WorkflowConditionSchema).default([]),
  steps: z.array(WorkflowStepSchema).default([]),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});

export const WorkflowInputSchema = WorkflowSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

export class WorkflowValidator {
  public static validate(workflow: unknown): { valid: boolean; errors: string[]; data?: Workflow } {
    const res = WorkflowSchema.safeParse(workflow);
    if (res.success) {
      // Validate that hotkey trigger has a hotkey string
      if (res.data.trigger.type === 'hotkey' && !res.data.trigger.hotkey) {
        return {
          valid: false,
          errors: ['Trigger of type "hotkey" requires a valid hotkey combination'],
        };
      }
      return { valid: true, errors: [], data: res.data as Workflow };
    }

    return {
      valid: false,
      errors: res.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  public static validateInput(input: unknown): { valid: boolean; errors: string[]; data?: WorkflowInput } {
    const res = WorkflowInputSchema.safeParse(input);
    if (res.success) {
      if (res.data.trigger.type === 'hotkey' && !res.data.trigger.hotkey) {
        return {
          valid: false,
          errors: ['Trigger of type "hotkey" requires a valid hotkey combination'],
        };
      }
      return { valid: true, errors: [], data: res.data };
    }

    return {
      valid: false,
      errors: res.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }
}
