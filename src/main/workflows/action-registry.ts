import {
  ActionExecutionContext,
  ActionResult,
  ActionType,
  ActionValidationResult,
} from './workflow-types';
import { WorkspaceRuntime } from '../runtime/workspace-runtime';
import { shell } from 'electron';
import { IntegrationRegistry } from '../integrations/integration-registry';

export interface WorkflowActionHandler {
  readonly type: ActionType;
  validate(params: Record<string, any>): ActionValidationResult;
  execute(context: ActionExecutionContext, params: Record<string, any>): Promise<ActionResult>;
}

export class ActionRegistry {
  private handlers: Map<ActionType, WorkflowActionHandler> = new Map();

  constructor(
    private runtime: WorkspaceRuntime,
    private integrationRegistry?: IntegrationRegistry
  ) {
    this.registerDefaults();
    this.registerIntegrationActions();
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

  private registerIntegrationActions(): void {
    const getIntegration = (id: string) => {
      if (!this.integrationRegistry) {
        throw new Error('IntegrationRegistry is not initialized');
      }
      const integration = this.integrationRegistry.get(id);
      if (!integration) {
        throw new Error(`Integration "${id}" is not registered`);
      }
      return integration;
    };

    // --- VS CODE ACTIONS ---
    const vsCodeActions: ActionType[] = [
      'OPEN_VSCODE',
      'FOCUS_VSCODE',
      'OPEN_VSCODE_FOLDER',
      'OPEN_VSCODE_FILE',
    ];

    for (const actionType of vsCodeActions) {
      this.register({
        type: actionType,
        validate: (p) => {
          if (actionType === 'OPEN_VSCODE_FILE' && !p.filePath && !p.path) {
            return { valid: false, errors: ['filePath required for OPEN_VSCODE_FILE'] };
          }
          return { valid: true, errors: [] };
        },
        execute: async (ctx, p) => {
          try {
            const vscode = getIntegration('vscode');
            const res = await vscode.execute({ type: actionType, parameters: p }, ctx);
            return { success: res.success, output: res.message || res.data, error: res.error };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
      });
    }

    // --- TERMINAL ACTIONS ---
    const terminalActions: ActionType[] = ['OPEN_TERMINAL', 'FOCUS_TERMINAL'];
    for (const actionType of terminalActions) {
      this.register({
        type: actionType,
        validate: () => ({ valid: true, errors: [] }),
        execute: async (ctx, p) => {
          try {
            const term = getIntegration('terminal');
            const res = await term.execute({ type: actionType, parameters: p }, ctx);
            return { success: res.success, output: res.message || res.data, error: res.error };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
      });
    }

    // --- GIT ACTIONS ---
    const gitActions: ActionType[] = [
      'GET_GIT_STATUS',
      'GET_GIT_CURRENT_BRANCH',
      'GET_GIT_DIFF',
    ];

    for (const actionType of gitActions) {
      this.register({
        type: actionType,
        validate: () => ({ valid: true, errors: [] }),
        execute: async (ctx, p) => {
          try {
            const git = getIntegration('git');
            const res = await git.execute({ type: actionType, parameters: p }, ctx);

            // If structured Git status or diff is retrieved, feed directly to ContextBuffer!
            if (res.success && res.data) {
              const contextRuntime = this.runtime.getContextRuntime();
              if (contextRuntime) {
                const buffer = contextRuntime.getBuffer();
                if (actionType === 'GET_GIT_STATUS') {
                  buffer.setGitContext({
                    branch: res.data.branch,
                    changedFiles: res.data.changedFiles,
                    stagedFiles: res.data.stagedFiles,
                  });
                } else if (actionType === 'GET_GIT_DIFF') {
                  const existing = buffer.getGitContext() || {
                    branch: 'unknown',
                    changedFiles: res.data.filesChanged,
                    stagedFiles: 0,
                  };
                  buffer.setGitContext({
                    ...existing,
                    diffSummary: res.data.diffSummary,
                  });
                }
              }
            }

            return {
              success: res.success,
              output: res.message || JSON.stringify(res.data),
              error: res.error,
            };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
      });
    }
  }
}
