import React, { useState } from 'react';
import { Button } from './Button';
import { X, Play, Plus, Trash2, Shield, Settings2, Clock, CheckCircle } from 'lucide-react';

interface WorkflowEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  onSave: (workflow: any) => Promise<void>;
  initialWorkflow?: any | null;
}

export const WorkflowEditorModal: React.FC<WorkflowEditorModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSave,
  initialWorkflow,
}) => {
  const [name, setName] = useState(initialWorkflow?.name || 'Quick Review Flow');
  const [triggerType, setTriggerType] = useState<'hotkey' | 'manual'>(initialWorkflow?.trigger?.type || 'hotkey');
  const [hotkey, setHotkey] = useState(initialWorkflow?.trigger?.hotkey || 'CommandOrControl+Shift+H');
  const [enabled, setEnabled] = useState(initialWorkflow ? initialWorkflow.enabled : true);

  const [conditions, setConditions] = useState<any[]>(
    initialWorkflow?.conditions || [
      { type: 'active-application', operator: 'contains', value: 'Code' },
    ]
  );

  const [steps, setSteps] = useState<any[]>(
    initialWorkflow?.steps || [
      { id: 's1', actionType: 'START_CONTEXT', parameters: {}, permissionLevel: 'SAFE' },
      { id: 's2', actionType: 'SHOW_OVERLAY', parameters: {}, permissionLevel: 'SAFE' },
      { id: 's3', actionType: 'REQUEST_AI_RESPONSE', parameters: { prompt: 'Analyze current workspace context and provide next step recommendation.' }, permissionLevel: 'SAFE' },
    ]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        id: `s_${Date.now()}`,
        actionType: 'REQUEST_AI_RESPONSE',
        parameters: {},
        permissionLevel: 'SAFE',
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleUpdateStep = (index: number, partial: any) => {
    setSteps(
      steps.map((s, i) => (i === index ? { ...s, ...partial } : s))
    );
  };

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { type: 'active-application', operator: 'contains', value: '' },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, partial: any) => {
    setConditions(
      conditions.map((c, i) => (i === index ? { ...c, ...partial } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        workspaceId,
        name,
        enabled,
        trigger: {
          type: triggerType,
          hotkey: triggerType === 'hotkey' ? hotkey : undefined,
        },
        conditions,
        steps,
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-surfaceBorder rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-textPrimary">
        {/* Header */}
        <div className="p-4 border-b border-surfaceBorder flex items-center justify-between bg-[#0E1422]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Settings2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">
                {initialWorkflow ? 'Edit Desktop Workflow' : 'Create Desktop Workflow'}
              </h3>
              <p className="text-[11px] text-textMuted -mt-0.5">Workspace: {workspaceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-textPrimary p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-2.5 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1">Workflow Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface border border-surfaceBorder rounded-lg px-3 py-1.5 text-xs text-textPrimary focus:outline-none focus:border-accent"
                placeholder="e.g. Code Review Assistance"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Trigger Type</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}
                  className="w-full bg-surface border border-surfaceBorder rounded-lg px-3 py-1.5 text-xs text-textPrimary focus:outline-none focus:border-accent"
                >
                  <option value="hotkey">Global Hotkey</option>
                  <option value="manual">Manual Overlay Action</option>
                </select>
              </div>

              {triggerType === 'hotkey' && (
                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1">Global Hotkey</label>
                  <input
                    type="text"
                    required
                    value={hotkey}
                    onChange={(e) => setHotkey(e.target.value)}
                    className="w-full bg-surface border border-surfaceBorder rounded-lg px-3 py-1.5 text-xs font-mono text-textPrimary focus:outline-none focus:border-accent"
                    placeholder="CommandOrControl+Shift+H"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="wf-enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-surfaceBorder text-accent bg-surface focus:ring-accent"
              />
              <label htmlFor="wf-enabled" className="text-xs text-textSecondary cursor-pointer">
                Enable workflow runtime execution
              </label>
            </div>
          </div>

          {/* Conditions Engine */}
          <div className="border-t border-surfaceBorder/60 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
                  Execution Conditions
                </h4>
                <p className="text-[11px] text-textMuted">Steps execute only when conditions evaluate to true.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={handleAddCondition}>
                Add Condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <div className="p-3 bg-surface/30 rounded-lg border border-dashed border-surfaceBorder text-center text-xs text-textMuted">
                No conditions defined (workflow runs whenever triggered).
              </div>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-surface/40 rounded-lg border border-surfaceBorder text-xs">
                    <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 bg-accent/10 rounded">
                      IF
                    </span>
                    <select
                      value={cond.type}
                      onChange={(e) => handleUpdateCondition(index, { type: e.target.value })}
                      className="bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    >
                      <option value="active-application">Active Application</option>
                      <option value="window-title">Window Title</option>
                      <option value="workspace-state">Workspace State</option>
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) => handleUpdateCondition(index, { operator: e.target.value })}
                      className="bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    >
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="not-equals">not equals</option>
                    </select>

                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                      placeholder="e.g. Code.exe or READY"
                      className="flex-1 bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="text-textMuted hover:text-danger p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          <div className="border-t border-surfaceBorder/60 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
                  Action Steps (Sequential Pipeline)
                </h4>
                <p className="text-[11px] text-textMuted">Actions executed in order by desktop runtime.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={handleAddStep}>
                Add Action Step
              </Button>
            </div>

            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={step.id || index} className="p-3 bg-surface/40 rounded-lg border border-surfaceBorder text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[10px] font-bold text-accent">
                        {index + 1}
                      </span>
                      <select
                        value={step.actionType}
                        onChange={(e) => handleUpdateStep(index, { actionType: e.target.value })}
                        className="bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs font-semibold text-textPrimary"
                      >
                        <option value="START_CONTEXT">START_CONTEXT</option>
                        <option value="STOP_CONTEXT">STOP_CONTEXT</option>
                        <option value="SHOW_OVERLAY">SHOW_OVERLAY</option>
                        <option value="HIDE_OVERLAY">HIDE_OVERLAY</option>
                        <option value="REQUEST_AI_RESPONSE">REQUEST_AI_RESPONSE</option>
                        <option value="OPEN_URL">OPEN_URL</option>
                        <option value="OPEN_APPLICATION">OPEN_APPLICATION</option>
                        <option value="OPEN_VSCODE">VS Code: Open / Focus</option>
                        <option value="OPEN_VSCODE_FOLDER">VS Code: Open Folder</option>
                        <option value="OPEN_VSCODE_FILE">VS Code: Open File</option>
                        <option value="OPEN_TERMINAL">Terminal: Open Windows Terminal / PowerShell</option>
                        <option value="GET_GIT_STATUS">Git: Inspect Repository Status</option>
                        <option value="GET_GIT_DIFF">Git: Inspect Diff & Uncommitted Changes</option>
                      </select>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {step.permissionLevel || 'SAFE'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStep(index)}
                      className="text-textMuted hover:text-danger p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Step specific parameter inputs */}
                  {step.actionType === 'OPEN_URL' && (
                    <input
                      type="url"
                      placeholder="Target URL (https://...)"
                      value={step.parameters?.url || ''}
                      onChange={(e) => handleUpdateStep(index, { parameters: { ...step.parameters, url: e.target.value } })}
                      className="w-full bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    />
                  )}

                  {step.actionType === 'OPEN_APPLICATION' && (
                    <input
                      type="text"
                      placeholder="Application executable or path (e.g. code.exe)"
                      value={step.parameters?.target || ''}
                      onChange={(e) => handleUpdateStep(index, { parameters: { ...step.parameters, target: e.target.value } })}
                      className="w-full bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    />
                  )}

                  {step.actionType === 'OPEN_VSCODE_FOLDER' && (
                    <input
                      type="text"
                      placeholder="Workspace directory path (defaults to current directory .)"
                      value={step.parameters?.folderPath || ''}
                      onChange={(e) => handleUpdateStep(index, { parameters: { ...step.parameters, folderPath: e.target.value } })}
                      className="w-full bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    />
                  )}

                  {step.actionType === 'OPEN_VSCODE_FILE' && (
                    <input
                      type="text"
                      placeholder="Target file path (e.g. src/index.ts)"
                      value={step.parameters?.filePath || ''}
                      onChange={(e) => handleUpdateStep(index, { parameters: { ...step.parameters, filePath: e.target.value } })}
                      className="w-full bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    />
                  )}

                  {step.actionType === 'OPEN_TERMINAL' && (
                    <input
                      type="text"
                      placeholder="Working directory (defaults to workspace directory)"
                      value={step.parameters?.workingDirectory || ''}
                      onChange={(e) => handleUpdateStep(index, { parameters: { ...step.parameters, workingDirectory: e.target.value } })}
                      className="w-full bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    />
                  )}

                  {step.actionType === 'REQUEST_AI_RESPONSE' && (
                    <input
                      type="text"
                      placeholder="Prompt instruction (optional - defaults to current context synthesis)"
                      value={step.parameters?.prompt || ''}
                      onChange={(e) => handleUpdateStep(index, { parameters: { ...step.parameters, prompt: e.target.value } })}
                      className="w-full bg-surface border border-surfaceBorder rounded px-2 py-1 text-xs text-textPrimary"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-surfaceBorder/60 pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {initialWorkflow ? 'Update Workflow' : 'Save Workflow'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
