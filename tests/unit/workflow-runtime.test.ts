import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowValidator } from '../../src/main/workflows/workflow-validator';
import { ActionPolicy } from '../../src/main/workflows/action-policy';
import { ActionRegistry } from '../../src/main/workflows/action-registry';
import { WorkflowRuntime } from '../../src/main/workflows/workflow-runtime';
import { WorkflowEventsBus } from '../../src/main/workflows/workflow-events';
import { Workflow } from '../../src/main/workflows/workflow-types';

describe('Workflow & Action Runtime (Phase 5)', () => {
  describe('WorkflowValidator', () => {
    it('validates correct workflow definitions', () => {
      const validWorkflow = {
        id: 'wf-1',
        workspaceId: 'ws-1',
        name: 'Test Workflow',
        enabled: true,
        trigger: { type: 'hotkey', hotkey: 'Ctrl+Shift+H' },
        conditions: [{ type: 'active-application', operator: 'contains', value: 'Code' }],
        steps: [
          {
            id: 's1',
            actionType: 'START_CONTEXT',
            parameters: {},
            permissionLevel: 'SAFE',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = WorkflowValidator.validate(validWorkflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid triggers missing hotkey string', () => {
      const invalid = {
        id: 'wf-2',
        workspaceId: 'ws-1',
        name: 'Invalid Hotkey Flow',
        enabled: true,
        trigger: { type: 'hotkey' }, // Missing hotkey
        conditions: [],
        steps: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = WorkflowValidator.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('hotkey');
    });
  });

  describe('ActionPolicy Security Boundaries', () => {
    it('classifies standard operational actions as SAFE', () => {
      expect(ActionPolicy.getPermissionLevel('SHOW_OVERLAY')).toBe('SAFE');
      expect(ActionPolicy.getPermissionLevel('START_CONTEXT')).toBe('SAFE');
      expect(ActionPolicy.getPermissionLevel('REQUEST_AI_RESPONSE')).toBe('SAFE');
      expect(ActionPolicy.isExecutionAllowed('SHOW_OVERLAY')).toBe(true);
    });

    it('strictly denies arbitrary or unknown actions as RESTRICTED', () => {
      expect(ActionPolicy.getPermissionLevel('RUN_SHELL_COMMAND' as any)).toBe('RESTRICTED');
      expect(ActionPolicy.isExecutionAllowed('RUN_SHELL_COMMAND' as any)).toBe(false);
      expect(ActionPolicy.isExecutionAllowed('RUN_SHELL_COMMAND' as any, true)).toBe(false);
    });
  });

  describe('WorkflowRuntime Execution Engine', () => {
    let mockStore: any;
    let mockRegistry: any;
    let mockRuntime: any;
    let mockHotkeyManager: any;
    let eventsBus: WorkflowEventsBus;
    let workflowRuntime: WorkflowRuntime;

    beforeEach(() => {
      mockStore = {
        getById: vi.fn(),
        listAll: vi.fn().mockReturnValue([]),
      };

      mockRegistry = {
        get: vi.fn(),
      };

      mockRuntime = {
        getSnapshot: vi.fn().mockReturnValue({
          status: 'READY',
          activeWorkspace: { id: 'ws-test', name: 'Test' },
          activeSession: { id: 'sess-123' },
          activeApplication: { processName: 'Code.exe', title: 'test.ts - Visual Studio Code' },
        }),
      };

      mockHotkeyManager = {
        register: vi.fn(),
        unregister: vi.fn(),
      };

      eventsBus = new WorkflowEventsBus();

      workflowRuntime = new WorkflowRuntime(
        mockStore,
        mockRegistry,
        mockRuntime,
        mockHotkeyManager,
        eventsBus
      );
    });

    it('evaluates conditions correctly based on runtime snapshot', () => {
      const matchingCond = [{ type: 'active-application', operator: 'contains', value: 'code' }] as any;
      expect(workflowRuntime.evaluateConditions(matchingCond).passed).toBe(true);

      const failingCond = [{ type: 'active-application', operator: 'equals', value: 'chrome.exe' }] as any;
      const res = workflowRuntime.evaluateConditions(failingCond);
      expect(res.passed).toBe(false);
      expect(res.reason).toContain('Condition');
    });

    it('executes steps in sequential order and emits typed events', async () => {
      const stepEvents: string[] = [];
      eventsBus.on('workflow:started', () => stepEvents.push('started'));
      eventsBus.on('workflow:step-started', (e) => stepEvents.push(`step-${e.stepIndex}-start`));
      eventsBus.on('workflow:step-completed', (e) => stepEvents.push(`step-${e.stepIndex}-done`));
      eventsBus.on('workflow:completed', () => stepEvents.push('completed'));

      const testWorkflow: Workflow = {
        id: 'wf-seq',
        workspaceId: 'ws-test',
        name: 'Sequential Test',
        enabled: true,
        trigger: { type: 'manual' },
        conditions: [],
        steps: [
          { id: 's1', actionType: 'START_CONTEXT', parameters: {}, permissionLevel: 'SAFE' },
          { id: 's2', actionType: 'SHOW_OVERLAY', parameters: {}, permissionLevel: 'SAFE' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.getById.mockReturnValue(testWorkflow);

      const mockHandler = {
        validate: () => ({ valid: true, errors: [] }),
        execute: vi.fn().mockResolvedValue({ success: true, output: 'OK' }),
      };
      mockRegistry.get.mockReturnValue(mockHandler);

      const runRes = await workflowRuntime.executeWorkflow('wf-seq');
      expect(runRes.success).toBe(true);
      expect(runRes.status).toBe('COMPLETED');
      expect(mockHandler.execute).toHaveBeenCalledTimes(2);

      expect(stepEvents).toEqual([
        'started',
        'step-1-start',
        'step-1-done',
        'step-2-start',
        'step-2-done',
        'completed',
      ]);
    });

    it('fails safely when condition evaluation is not satisfied', async () => {
      const testWorkflow: Workflow = {
        id: 'wf-cond-fail',
        workspaceId: 'ws-test',
        name: 'Condition Fail Test',
        enabled: true,
        trigger: { type: 'manual' },
        conditions: [{ type: 'workspace-state', operator: 'equals', value: 'CAPTURING' }], // current snapshot is READY
        steps: [{ id: 's1', actionType: 'SHOW_OVERLAY', parameters: {}, permissionLevel: 'SAFE' }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.getById.mockReturnValue(testWorkflow);

      const res = await workflowRuntime.executeWorkflow('wf-cond-fail');
      expect(res.success).toBe(false);
      expect(res.status).toBe('FAILED');
      expect(res.error).toContain('Condition failed');
    });

    it('supports execution timeout and terminates safely', async () => {
      const testWorkflow: Workflow = {
        id: 'wf-timeout',
        workspaceId: 'ws-test',
        name: 'Timeout Test',
        enabled: true,
        trigger: { type: 'manual' },
        conditions: [],
        steps: [
          {
            id: 's-slow',
            actionType: 'REQUEST_AI_RESPONSE',
            parameters: {},
            permissionLevel: 'SAFE',
            timeoutMs: 50, // 50ms timeout for test
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.getById.mockReturnValue(testWorkflow);

      const slowHandler = {
        validate: () => ({ valid: true, errors: [] }),
        execute: () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300)),
      };
      mockRegistry.get.mockReturnValue(slowHandler);

      const res = await workflowRuntime.executeWorkflow('wf-timeout');
      expect(res.success).toBe(false);
      expect(res.status).toBe('FAILED');
      expect(res.error).toContain('timed out');
    });

    it('cancels active workflow execution when requested', async () => {
      const testWorkflow: Workflow = {
        id: 'wf-cancel',
        workspaceId: 'ws-test',
        name: 'Cancellation Test',
        enabled: true,
        trigger: { type: 'manual' },
        conditions: [],
        steps: [
          {
            id: 's1',
            actionType: 'REQUEST_AI_RESPONSE',
            parameters: {},
            permissionLevel: 'SAFE',
            timeoutMs: 1000,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockStore.getById.mockReturnValue(testWorkflow);

      const longHandler = {
        validate: () => ({ valid: true, errors: [] }),
        execute: () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 600)),
      };
      mockRegistry.get.mockReturnValue(longHandler);

      const promise = workflowRuntime.executeWorkflow('wf-cancel');
      // Trigger cancellation immediately
      setTimeout(() => workflowRuntime.cancelWorkflow('wf-cancel'), 20);

      const res = await promise;
      expect(res.status).toBe('FAILED'); // step handler was cancelled
    });
  });
});
