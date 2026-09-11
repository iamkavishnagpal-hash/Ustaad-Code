import React, { useState, useEffect } from 'react';
import { Workspace, WorkspaceInput, RuntimeStateSnapshot } from '../../shared/types';
import { WorkspaceList } from './components/WorkspaceList';
import { WorkspaceEditorModal } from './components/WorkspaceEditorModal';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import { WorkflowEditorModal } from './components/WorkflowEditorModal';
import { IntegrationSettingsModal } from './components/IntegrationSettingsModal';
import { Button } from './components/Button';
import { Plus, Shield, Layers, Power, RefreshCw, Cpu, Workflow as WorkflowIcon, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [selectedWorkspaceForWorkflow, setSelectedWorkspaceForWorkflow] = useState<Workspace | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeStateSnapshot | null>(null);

  const api = window.workspaceApi;

  const loadWorkspaces = async () => {
    try {
      if (!api) return;
      const list = await api.listWorkspaces();
      setWorkspaces(list);
      const state = await api.getRuntimeState();
      setRuntimeState(state);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();

    if (api) {
      const unsub = api.onStateChanged((state) => {
        setRuntimeState(state);
      });
      return () => unsub();
    }
  }, []);

  const handleSaveWorkspace = async (input: WorkspaceInput) => {
    if (!api) return;
    if (editingWorkspace) {
      await api.updateWorkspace(editingWorkspace.id, input);
    } else {
      await api.createWorkspace(input);
    }
    await loadWorkspaces();
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!api) return;
    if (window.confirm('Are you sure you want to delete this workspace?')) {
      await api.deleteWorkspace(id);
      await loadWorkspaces();
    }
  };

  const handleActivate = async (id: string) => {
    if (!api) return;
    await api.activateWorkspace(id);
  };

  const handleStopRuntime = async () => {
    if (!api) return;
    await api.stopRuntime();
  };

  const handleSaveWorkflow = async (workflowPayload: any) => {
    if (!api || !api.createWorkflow) return;
    await api.createWorkflow(workflowPayload);
    await loadWorkspaces();
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary flex flex-col">
      {/* Top Windows Titlebar / Header */}
      <header className="h-14 border-b border-surfaceBorder bg-[#0E1422]/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold">
            <Layers size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Personal AI Workspace OS</h1>
            <p className="text-[11px] text-textMuted -mt-0.5">Desktop Runtime Layer · Workflow Engine</p>
          </div>
        </div>

        {/* Runtime Status Pill */}
        <div className="flex items-center gap-4">
          {runtimeState && runtimeState.status !== 'IDLE' ? (
            <div className="flex items-center gap-3 bg-surface px-3 py-1.5 rounded-lg border border-surfaceBorder">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {runtimeState.status}
              </span>
              <span className="text-xs text-textSecondary truncate max-w-[180px]">
                {runtimeState.activeWorkspace?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={Power}
                onClick={handleStopRuntime}
                className="text-textMuted hover:text-danger hover:bg-danger/10 p-1 h-auto"
                title="Deactivate Runtime"
              >
                Stop
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-textMuted">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Runtime Idle
            </div>
          )}

          {/* AI Providers Management Modal Button */}
          <Button
            variant="ghost"
            size="sm"
            icon={Cpu}
            onClick={() => setIsProviderModalOpen(true)}
            className="text-textSecondary hover:text-textPrimary border border-surfaceBorder"
          >
            AI Providers
          </Button>

          {/* IT Application Integrations Button (Phase 6) */}
          <Button
            variant="ghost"
            size="sm"
            icon={Terminal}
            onClick={() => setIsIntegrationModalOpen(true)}
            className="text-textSecondary hover:text-textPrimary border border-surfaceBorder"
          >
            Integrations
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setEditingWorkspace(null);
              setIsModalOpen(true);
            }}
          >
            Create Workspace
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-textPrimary">Saved AI Workspaces</h2>
            <p className="text-xs text-textSecondary mt-0.5">
              Press any assigned hotkey anywhere in Windows to activate the source, live context, and desktop workflows.
            </p>
          </div>
          <button
            onClick={loadWorkspaces}
            className="p-1.5 text-textMuted hover:text-textPrimary rounded-lg hover:bg-surface border border-surfaceBorder transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-textMuted text-xs">Loading local SQLite database...</div>
        ) : (
          <WorkspaceList
            workspaces={workspaces}
            onActivate={handleActivate}
            onEdit={(ws) => {
              setEditingWorkspace(ws);
              setIsModalOpen(true);
            }}
            onDelete={handleDeleteWorkspace}
            onManageWorkflows={(ws) => {
              setSelectedWorkspaceForWorkflow(ws);
              setIsWorkflowModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Privacy Notice Banner */}
      <footer className="border-t border-surfaceBorder/60 py-3 px-6 text-center text-[11px] text-textMuted bg-[#0E1422]/50 flex items-center justify-center gap-2">
        <Shield size={13} className="text-slate-400" />
        <span>Capture protection active for supported Windows capture paths. Safe desktop workflow runtime.</span>
      </footer>

      {/* Workspace Editor Modal */}
      <WorkspaceEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWorkspace}
        initialWorkspace={editingWorkspace}
      />

      {/* AI Provider Settings Modal */}
      <ProviderSettingsModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
      />

      {/* IT Application Integrations Modal (Phase 6) */}
      <IntegrationSettingsModal
        isOpen={isIntegrationModalOpen}
        onClose={() => setIsIntegrationModalOpen(false)}
      />

      {/* Phase 5 Workflow Editor Modal */}
      {selectedWorkspaceForWorkflow && (
        <WorkflowEditorModal
          isOpen={isWorkflowModalOpen}
          onClose={() => {
            setIsWorkflowModalOpen(false);
            setSelectedWorkspaceForWorkflow(null);
          }}
          workspaceId={selectedWorkspaceForWorkflow.id}
          workspaceName={selectedWorkspaceForWorkflow.name}
          onSave={handleSaveWorkflow}
        />
      )}
    </div>
  );
};
