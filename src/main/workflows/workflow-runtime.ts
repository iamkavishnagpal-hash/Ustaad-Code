import { ActionPolicy } from './action-policy';
import { ActionRegistry } from './action-registry';
import { WorkflowEventsBus, WorkflowExecutionAudit } from './workflow-events';
import { WorkflowStore } from './workflow-store';
import {
  ActionExecutionContext,
  Workflow,
  WorkflowCondition,
  WorkflowStatus,
  WorkflowStep,
} from './workflow-types';
import { WorkspaceRuntime } from '../runtime/workspace-runtime';
import { HotkeyManager } from '../hotkeys/hotkey-manager';

export interface WorkflowRunOptions {
  variables?: Record<string, unknown>;
  confirmedActions?: boolean;
}

export class WorkflowRuntime {
  private activeExecutions: Map<string, { abortController: AbortController; timeoutTimer?: NodeJS.Timeout }> = new Map();
  private auditLog: WorkflowExecutionAudit[] = [];
  private currentStatus: WorkflowStatus = 'IDLE';

  constructor(
    private store: WorkflowStore,
    private actionRegistry: ActionRegistry,
    private runtime: WorkspaceRuntime,
    private hotkeyManager: HotkeyManager,
    private eventsBus: WorkflowEventsBus
  ) {}

  public getStatus(): WorkflowStatus {
    return this.currentStatus;
  }

  public getAuditTrail(): WorkflowExecutionAudit[] {
    return [...this.auditLog];
  }

  public initializeHotkeys(): void {
    const workflows = this.store.listAll();
    for (const wf of workflows) {
      if (wf.enabled && wf.trigger.type === 'hotkey' && wf.trigger.hotkey) {
        this.bindWorkflowHotkey(wf);
      }
    }
  }

  public bindWorkflowHotkey(workflow: Workflow): void {
    if (workflow.trigger.type !== 'hotkey' || !workflow.trigger.hotkey) return;

    this.hotkeyManager.register(workflow.trigger.hotkey, async () => {
      await this.executeWorkflow(workflow.id);
    });
  }

  public unbindWorkflowHotkey(hotkey: string): void {
    this.hotkeyManager.unregister(hotkey);
  }

  public async executeWorkflow(
    workflowId: string,
    options: WorkflowRunOptions = {}
  ): Promise<{ success: boolean; status: WorkflowStatus; error?: string }> {
    const workflow = this.store.getById(workflowId);
    if (!workflow) {
      return { success: false, status: 'FAILED', error: `Workflow with id "${workflowId}" not found` };
    }

    if (!workflow.enabled) {
      return { success: false, status: 'IDLE', error: `Workflow "${workflow.name}" is disabled` };
    }

    // Cancellation token setup
    const abortController = new AbortController();
    const executionId = `${workflow.id}-${Date.now()}`;
    this.activeExecutions.set(executionId, { abortController });

    const audit: WorkflowExecutionAudit = {
      workflowId: workflow.id,
      workspaceId: workflow.workspaceId,
      startedAt: Date.now(),
      status: 'RUNNING',
      stepsExecuted: 0,
    };

    this.currentStatus = 'RUNNING';
    this.eventsBus.notifyWorkflowStarted({
      workflowId: workflow.id,
      workspaceId: workflow.workspaceId,
      workflowName: workflow.name,
      status: 'RUNNING',
      totalSteps: workflow.steps.length,
      timestamp: Date.now(),
    });

    try {
      // 1. Evaluate Conditions
      const conditionResult = this.evaluateConditions(workflow.conditions);
      if (!conditionResult.passed) {
        const failureReason = `Condition failed: ${conditionResult.reason}`;
        this.currentStatus = 'FAILED';
        audit.status = 'FAILED';
        audit.completedAt = Date.now();
        audit.failureReason = failureReason;
        this.auditLog.push(audit);

        this.eventsBus.notifyWorkflowFailed({
          workflowId: workflow.id,
          workspaceId: workflow.workspaceId,
          workflowName: workflow.name,
          status: 'FAILED',
          error: failureReason,
          timestamp: Date.now(),
        });
        return { success: false, status: 'FAILED', error: failureReason };
      }

      // 2. Prepare Context
      const snapshot = this.runtime.getSnapshot();
      const executionContext: ActionExecutionContext = {
        workspaceId: workflow.workspaceId,
        sessionId: snapshot.activeSession?.id,
        activeApplication: snapshot.activeApplication?.processName || snapshot.activeApplication?.title,
        variables: { ...(options.variables || {}) },
      };

      // 3. Execute Steps Sequentially
      for (let i = 0; i < workflow.steps.length; i++) {
        if (abortController.signal.aborted) {
          this.currentStatus = 'CANCELLED';
          audit.status = 'CANCELLED';
          audit.completedAt = Date.now();
          this.auditLog.push(audit);

          this.eventsBus.notifyWorkflowCancelled({
            workflowId: workflow.id,
            workspaceId: workflow.workspaceId,
            workflowName: workflow.name,
            status: 'CANCELLED',
            stepIndex: i,
            totalSteps: workflow.steps.length,
            timestamp: Date.now(),
          });
          return { success: false, status: 'CANCELLED', error: 'Workflow execution cancelled by user' };
        }

        const step = workflow.steps[i];
        this.eventsBus.notifyStepStarted({
          workflowId: workflow.id,
          workspaceId: workflow.workspaceId,
          workflowName: workflow.name,
          status: 'RUNNING',
          stepIndex: i + 1,
          totalSteps: workflow.steps.length,
          stepAction: step.actionType,
          timestamp: Date.now(),
        });

        // Permission Policy Guard
        const isAllowed = ActionPolicy.isExecutionAllowed(step.actionType, options.confirmedActions);
        if (!isAllowed) {
          const permError = `Action "${step.actionType}" requires elevated confirmation or is RESTRICTED`;
          this.currentStatus = 'FAILED';
          audit.status = 'FAILED';
          audit.completedAt = Date.now();
          audit.failureReason = permError;
          this.auditLog.push(audit);

          this.eventsBus.notifyWorkflowFailed({
            workflowId: workflow.id,
            workspaceId: workflow.workspaceId,
            workflowName: workflow.name,
            status: 'FAILED',
            stepIndex: i + 1,
            totalSteps: workflow.steps.length,
            stepAction: step.actionType,
            error: permError,
            timestamp: Date.now(),
          });
          return { success: false, status: 'FAILED', error: permError };
        }

        // Action Handler Execution with Timeout
        const handler = this.actionRegistry.get(step.actionType);
        if (!handler) {
          const handlerError = `No handler registered for action type "${step.actionType}"`;
          this.currentStatus = 'FAILED';
          audit.status = 'FAILED';
          audit.completedAt = Date.now();
          audit.failureReason = handlerError;
          this.auditLog.push(audit);

          this.eventsBus.notifyWorkflowFailed({
            workflowId: workflow.id,
            workspaceId: workflow.workspaceId,
            workflowName: workflow.name,
            status: 'FAILED',
            error: handlerError,
            timestamp: Date.now(),
          });
          return { success: false, status: 'FAILED', error: handlerError };
        }

        const validation = handler.validate(step.parameters || {});
        if (!validation.valid) {
          const valError = `Invalid parameters for ${step.actionType}: ${validation.errors.join(', ')}`;
          this.currentStatus = 'FAILED';
          audit.status = 'FAILED';
          audit.completedAt = Date.now();
          audit.failureReason = valError;
          this.auditLog.push(audit);

          this.eventsBus.notifyWorkflowFailed({
            workflowId: workflow.id,
            workspaceId: workflow.workspaceId,
            workflowName: workflow.name,
            status: 'FAILED',
            error: valError,
            timestamp: Date.now(),
          });
          return { success: false, status: 'FAILED', error: valError };
        }

        // Execute step guarded by per-step or default timeout (default 30s)
        const timeoutMs = step.timeoutMs || 30000;
        const stepResult = await this.executeStepWithTimeout(handler, executionContext, step, timeoutMs, abortController.signal);

        if (!stepResult.success) {
          const stepErr = stepResult.error || `Step ${step.actionType} failed`;
          this.currentStatus = 'FAILED';
          audit.status = 'FAILED';
          audit.completedAt = Date.now();
          audit.failureReason = stepErr;
          this.auditLog.push(audit);

          this.eventsBus.notifyWorkflowFailed({
            workflowId: workflow.id,
            workspaceId: workflow.workspaceId,
            workflowName: workflow.name,
            status: 'FAILED',
            stepIndex: i + 1,
            totalSteps: workflow.steps.length,
            stepAction: step.actionType,
            error: stepErr,
            timestamp: Date.now(),
          });
          return { success: false, status: 'FAILED', error: stepErr };
        }

        audit.stepsExecuted++;
        this.eventsBus.notifyStepCompleted({
          workflowId: workflow.id,
          workspaceId: workflow.workspaceId,
          workflowName: workflow.name,
          status: 'RUNNING',
          stepIndex: i + 1,
          totalSteps: workflow.steps.length,
          stepAction: step.actionType,
          message: typeof stepResult.output === 'string' ? stepResult.output : undefined,
          timestamp: Date.now(),
        });
      }

      this.currentStatus = 'COMPLETED';
      audit.status = 'COMPLETED';
      audit.completedAt = Date.now();
      this.auditLog.push(audit);

      this.eventsBus.notifyWorkflowCompleted({
        workflowId: workflow.id,
        workspaceId: workflow.workspaceId,
        workflowName: workflow.name,
        status: 'COMPLETED',
        totalSteps: workflow.steps.length,
        timestamp: Date.now(),
      });

      return { success: true, status: 'COMPLETED' };
    } catch (err: any) {
      const errMessage = err?.message || 'Unexpected workflow execution error';
      this.currentStatus = 'FAILED';
      audit.status = 'FAILED';
      audit.completedAt = Date.now();
      audit.failureReason = errMessage;
      this.auditLog.push(audit);

      this.eventsBus.notifyWorkflowFailed({
        workflowId: workflow.id,
        workspaceId: workflow.workspaceId,
        workflowName: workflow.name,
        status: 'FAILED',
        error: errMessage,
        timestamp: Date.now(),
      });
      return { success: false, status: 'FAILED', error: errMessage };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  public cancelWorkflow(workflowId?: string): void {
    for (const [key, execution] of this.activeExecutions.entries()) {
      if (!workflowId || key.startsWith(workflowId)) {
        execution.abortController.abort();
        if (execution.timeoutTimer) clearTimeout(execution.timeoutTimer);
      }
    }
    this.currentStatus = 'CANCELLED';
  }

  public evaluateConditions(conditions: WorkflowCondition[]): { passed: boolean; reason?: string } {
    if (!conditions || conditions.length === 0) {
      return { passed: true };
    }

    const snapshot = this.runtime.getSnapshot();

    for (const cond of conditions) {
      let actualValue = '';
      if (cond.type === 'active-application') {
        actualValue = snapshot.activeApplication?.processName || '';
      } else if (cond.type === 'window-title') {
        actualValue = snapshot.activeApplication?.title || '';
      } else if (cond.type === 'workspace-state') {
        actualValue = snapshot.status;
      }

      const expected = cond.value.toLowerCase();
      const actual = actualValue.toLowerCase();

      let isMatch = false;
      if (cond.operator === 'equals') {
        isMatch = actual === expected;
      } else if (cond.operator === 'contains') {
        isMatch = actual.includes(expected);
      } else if (cond.operator === 'not-equals') {
        isMatch = actual !== expected;
      }

      if (!isMatch) {
        return {
          passed: false,
          reason: `Condition [${cond.type} ${cond.operator} "${cond.value}"] evaluated to false (actual: "${actualValue}")`,
        };
      }
    }

    return { passed: true };
  }

  private async executeStepWithTimeout(
    handler: any,
    context: ActionExecutionContext,
    step: WorkflowStep,
    timeoutMs: number,
    signal: AbortSignal
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    return new Promise((resolve) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ success: false, error: `Step "${step.actionType}" timed out after ${timeoutMs}ms` });
        }
      }, timeoutMs);

      const abortListener = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ success: false, error: 'Step cancelled' });
        }
      };

      signal.addEventListener('abort', abortListener, { once: true });

      handler
        .execute(context, step.parameters || {})
        .then((res: any) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            signal.removeEventListener('abort', abortListener);
            resolve(res);
          }
        })
        .catch((err: any) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            signal.removeEventListener('abort', abortListener);
            resolve({ success: false, error: err.message });
          }
        });
    });
  }
}
