import React, { useState, useEffect } from 'react';
import { Workspace, WorkspaceInput, RuntimeStateSnapshot } from '../../shared/types';
import { WorkspaceList } from './components/WorkspaceList';
import { WorkspaceEditorModal } from './components/WorkspaceEditorModal';
import { Button } from './components/Button';
import { Plus, Shield, Layers, Power, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
            <p className="text-[11px] text-textMuted -mt-0.5">Desktop Runtime Layer</p>
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
                className="text-danger hover:bg-danger/10 px-2 py-1"
              >
                Stop
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#0E1422] px-3 py-1 rounded-md border border-surfaceBorder text-xs text-textMuted">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Runtime IDLE
            </div>
          )}

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
              Press any assigned hotkey anywhere in Windows to activate the source and overlay HUD.
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
          />
        )}
      </main>

      {/* Privacy Notice Banner */}
      <footer className="border-t border-surfaceBorder/60 py-3 px-6 text-center text-[11px] text-textMuted bg-[#0E1422]/50 flex items-center justify-center gap-2">
        <Shield size={13} className="text-slate-400" />
        <span>Capture protection active for supported Windows capture paths. No mock telemetry.</span>
      </footer>

      {/* Workspace Editor Modal */}
      <WorkspaceEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWorkspace}
        initialWorkspace={editingWorkspace}
      />
    </div>
  );
};
