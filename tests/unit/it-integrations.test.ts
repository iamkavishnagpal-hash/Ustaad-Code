import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationRegistry } from '../../src/main/integrations/integration-registry';
import { VsCodeIntegration } from '../../src/main/integrations/vscode/vscode-integration';
import { TerminalIntegration } from '../../src/main/integrations/terminal/terminal-integration';
import { GitIntegration } from '../../src/main/integrations/git/git-integration';
import { ActionRegistry } from '../../src/main/workflows/action-registry';
import { ActionPolicy } from '../../src/main/workflows/action-policy';
import { WorkflowRuntime } from '../../src/main/workflows/workflow-runtime';
import { WorkflowEventsBus } from '../../src/main/workflows/workflow-events';
import { Workflow } from '../../src/main/workflows/workflow-types';

describe('Phase 6 — IT Application Integration Runtime', () => {
  describe('IntegrationRegistry & Discovery', () => {
    it('registers and discovers desktop capability providers', async () => {
      const registry = new IntegrationRegistry();
      const vscode = new VsCodeIntegration();
      const terminal = new TerminalIntegration();
      const git = new GitIntegration();

      registry.register(vscode);
      registry.register(terminal);
      registry.register(git);

      expect(registry.list()).toHaveLength(3);
      expect(registry.get('vscode')).toBe(vscode);
      expect(registry.get('terminal')).toBe(terminal);
      expect(registry.get('git')).toBe(git);

      const statuses = await registry.getStatuses();
      expect(statuses).toHaveLength(3);
      expect(statuses.map((s) => s.id)).toEqual(['vscode', 'terminal', 'git']);
    });
  });

  describe('VS Code Integration Action Validation', () => {
    let vscode: VsCodeIntegration;

    beforeEach(() => {
      vscode = new VsCodeIntegration();
    });

    it('exposes explicit desktop capabilities', () => {
      const caps = vscode.getCapabilities();
      const names = caps.map((c) => c.name);
      expect(names).toContain('OPEN');
      expect(names).toContain('FOCUS');
      expect(names).toContain('OPEN_FOLDER');
      expect(names).toContain('OPEN_FILE');
    });

    it('validates OPEN_FILE requirements', async () => {
      // Stub isAvailable to true for test
      vi.spyOn(vscode, 'isAvailable').mockResolvedValue(true);
      const res = await vscode.execute(
        { type: 'OPEN_FILE', parameters: {} },
        { workspaceId: 'ws-1', variables: {} }
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('filePath');
    });
  });

  describe('Git Integration Result Parsing', () => {
    let git: GitIntegration;

    beforeEach(() => {
      git = new GitIntegration();
    });

    it('parses structured Git status correctly', async () => {
      vi.spyOn(git, 'isAvailable').mockResolvedValue(true);
      vi.spyOn(git, 'getCurrentBranch').mockResolvedValue('feature/phase6-it-integrations');

      const mockPorcelain = ` M src/main/index.ts\nM  src/main/workflows/action-registry.ts\n?? tests/unit/integrations.test.ts\n`;
      (git as any).execGit = vi.fn().mockResolvedValue(mockPorcelain);

      const status = await git.getStatus(process.cwd());
      expect(status.branch).toBe('feature/phase6-it-integrations');
      expect(status.hasUncommittedChanges).toBe(true);
      expect(status.files).toHaveLength(3);
      expect(status.changedFiles).toBe(3); // 2 modified + 1 untracked
      expect(status.stagedFiles).toBe(1);
      expect(status.untrackedFiles).toBe(1);
    });

    it('parses structured Git diff stats correctly', async () => {
      vi.spyOn(git, 'isAvailable').mockResolvedValue(true);
      (git as any).execGit = vi.fn().mockImplementation((args: string[]) => {
        if (args.includes('--shortstat')) {
          return Promise.resolve(' 3 files changed, 45 insertions(+), 10 deletions(-)\n');
        }
        return Promise.resolve('diff --git a/test.ts b/test.ts\n+ console.log("ok");\n');
      });

      const diff = await git.getDiff(process.cwd());
      expect(diff.filesChanged).toBe(3);
      expect(diff.insertions).toBe(45);
      expect(diff.deletions).toBe(10);
      expect(diff.diffSummary).toContain('diff --git');
    });
  });

  describe('ActionPolicy Security Enforcement', () => {
    it('classifies IT integration operations as SAFE', () => {
      expect(ActionPolicy.getPermissionLevel('OPEN_VSCODE')).toBe('SAFE');
      expect(ActionPolicy.getPermissionLevel('OPEN_TERMINAL')).toBe('SAFE');
      expect(ActionPolicy.getPermissionLevel('GET_GIT_STATUS')).toBe('SAFE');
      expect(ActionPolicy.getPermissionLevel('GET_GIT_DIFF')).toBe('SAFE');
    });

    it('strictly denies arbitrary command injection as RESTRICTED', () => {
      expect(ActionPolicy.getPermissionLevel('EXECUTE_COMMAND' as any)).toBe('RESTRICTED');
      expect(ActionPolicy.isExecutionAllowed('EXECUTE_COMMAND' as any)).toBe(false);
    });
  });

  describe('End-to-End Workflow → Integration → Context Pipeline', () => {
    it('executes Git integration in workflow and feeds structured repository context to ContextBuffer', async () => {
      const mockBuffer = {
        setGitContext: vi.fn(),
        getGitContext: vi.fn().mockReturnValue(null),
      };

      const mockContextRuntime = {
        getBuffer: () => mockBuffer,
      };

      const mockRuntime: any = {
        getContextRuntime: () => mockContextRuntime,
        getSnapshot: () => ({
          status: 'READY',
          activeWorkspace: { id: 'ws-it', name: 'Dev Workspace' },
          activeSession: { id: 'sess-it' },
          activeApplication: { processName: 'Code.exe', title: 'VS Code' },
        }),
      };

      const integrationRegistry = new IntegrationRegistry();
      const mockGit: any = {
        id: 'git',
        name: 'Local Git',
        isAvailable: vi.fn().mockResolvedValue(true),
        getCapabilities: () => [],
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: {
            branch: 'main',
            changedFiles: 2,
            stagedFiles: 1,
            untrackedFiles: 0,
            hasUncommittedChanges: true,
          },
          message: 'Branch main: 2 changed files',
        }),
      };
      integrationRegistry.register(mockGit);

      const actionRegistry = new ActionRegistry(mockRuntime, integrationRegistry);

      const workflowStore: any = {
        getById: vi.fn().mockReturnValue({
          id: 'wf-git',
          workspaceId: 'ws-it',
          name: 'Inspect Git Changes',
          enabled: true,
          trigger: { type: 'manual' },
          conditions: [],
          steps: [
            {
              id: 's1',
              actionType: 'GET_GIT_STATUS',
              parameters: {},
              permissionLevel: 'SAFE',
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      };

      const workflowRuntime = new WorkflowRuntime(
        workflowStore,
        actionRegistry,
        mockRuntime,
        { register: vi.fn(), unregister: vi.fn() } as any,
        new WorkflowEventsBus()
      );

      const result = await workflowRuntime.executeWorkflow('wf-git');
      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(mockGit.execute).toHaveBeenCalledTimes(1);

      // Verify ContextBuffer was updated with structured Git telemetry!
      expect(mockBuffer.setGitContext).toHaveBeenCalledWith({
        branch: 'main',
        changedFiles: 2,
        stagedFiles: 1,
      });
    });
  });
});
