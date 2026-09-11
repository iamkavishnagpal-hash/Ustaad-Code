import {
  ActionExecutionContext,
  ActionResult,
  ActionType,
  ActionValidationResult,
} from './workflow-types';
import { WorkspaceRuntime } from '../runtime/workspace-runtime';
import { shell } from 'electron';

export interface WorkflowActionHandler {
  readonly type: ActionType;
  validate(params: Record<string, any>): ActionValidationResult;
  execute(context: ActionExecutionContext, params: Record<string, any>): Promise<ActionResult>;
}

export class ActionRegistry {
  private handlers: Map<ActionType, WorkflowActionHandler> = new Map();

  constructor(private runtime: WorkspaceRuntime) {
    this.registerDefaults();
  }

  public register(handler: WorkflowActionHandler): void {
    this.handlers.set(handler.type, handler);
  }

  public get(type: ActionType): WorkflowActionHandler | undefined {
    return this.handlers.get(type);
  }

  private registerDefaults(): void {
    // 1. OPEN_URL
    this.register({
      type: 'OPEN_URL',
      validate: (p) => ({
        valid: typeof p.url === 'string' && (p.url.startsWith('http://') || p.url.startsWith('https://')),
        errors: typeof p.url === 'string' ? [] : ['Valid http/https url parameter required'],
      }),
      execute: async (_ctx, p) => {
        try {
          if (shell && typeof shell.openExternal === 'function') {
            await shell.openExternal(p.url);
          }
          return { success: true, output: `Opened ${p.url}` };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    });

    // 2. OPEN_APPLICATION
    this.register({
      type: 'OPEN_APPLICATION',
      validate: (p) => ({
        valid: typeof p.target === 'string' && p.target.trim().length > 0,
        errors: typeof p.target === 'string' ? [] : ['Target application path or command required'],
      }),
      execute: async (_ctx, p) => {
        try {
          if (shell && typeof shell.openPath === 'function') {
            await shell.openPath(p.target);
          }
          return { success: true, output: `Dispatched launch for ${p.target}` };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    });

    // 3. SHOW_OVERLAY
    this.register({
      type: 'SHOW_OVERLAY',
      validate: () => ({ valid: true, errors: [] }),
      execute: async () => {
        return { success: true, output: 'Overlay shown' };
      },
    });

    // 4. HIDE_OVERLAY
    this.register({
      type: 'HIDE_OVERLAY',
      validate: () => ({ valid: true, errors: [] }),
      execute: async () => {
        return { success: true, output: 'Overlay hidden' };
      },
    });

    // 5. START_CONTEXT
    this.register({
      type: 'START_CONTEXT',
      validate: () => ({ valid: true, errors: [] }),
      execute: async () => {
        try {
          await this.runtime.startListening();
          return { success: true, output: 'Audio and screen context started' };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    });

    // 6. STOP_CONTEXT
    this.register({
      type: 'STOP_CONTEXT',
      validate: () => ({ valid: true, errors: [] }),
      execute: async () => {
        await this.runtime.stopListening();
        return { success: true, output: 'Context capture stopped' };
      },
    });

    // 7. REQUEST_AI_RESPONSE
    this.register({
      type: 'REQUEST_AI_RESPONSE',
      validate: () => ({ valid: true, errors: [] }),
      execute: async (_ctx, p) => {
        try {
          const res = await this.runtime.requestAiResponse(p.prompt, p.providerId);
          return { success: true, output: res.content };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    });
  }
}
