import React, { useState } from 'react';
import { Workspace, WorkspaceInput } from '../../../shared/types';
import { Button } from './Button';
import { HotkeyInput } from './HotkeyInput';
import { X, Globe, Terminal, Cpu } from 'lucide-react';

interface WorkspaceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: WorkspaceInput) => Promise<void>;
  initialWorkspace?: Workspace | null;
}

export const WorkspaceEditorModal: React.FC<WorkspaceEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWorkspace,
}) => {
  const [name, setName] = useState(initialWorkspace?.name || '');
  const [description, setDescription] = useState(initialWorkspace?.description || '');
  const [kind, setKind] = useState<'web' | 'api' | 'local'>(initialWorkspace?.source.kind || 'web');
  const [provider, setProvider] = useState<'chatgpt' | 'gemini' | 'claude' | 'custom' | 'ollama'>(
    initialWorkspace?.source.provider || 'chatgpt'
  );
  const [url, setUrl] = useState(initialWorkspace?.source.url || 'https://chatgpt.com');
  const [endpoint, setEndpoint] = useState(initialWorkspace?.source.endpoint || '');
  const [hotkey, setHotkey] = useState(initialWorkspace?.hotkey || 'Ctrl+Shift+H');
  const [captureProtection, setCaptureProtection] = useState(initialWorkspace?.privacy.captureProtection || false);
  const [overlayPolicy, setOverlayPolicy] = useState<'normal' | 'exclude-when-supported'>(
    initialWorkspace?.privacy.overlayCapturePolicy || 'normal'
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Workspace name cannot be empty');
      return;
    }

    if (kind === 'web' && !url.trim()) {
      setError('A valid source URL is required for web workspaces');
      return;
    }

    if (!hotkey.trim()) {
      setError('Global activation shortcut is required');
      return;
    }

    setSaving(true);
    try {
      const input: WorkspaceInput = {
        name: name.trim(),
        description: description.trim(),
        source: {
          kind,
          provider,
          url: kind === 'web' ? url.trim() : undefined,
          endpoint: kind !== 'web' ? endpoint.trim() : undefined,
        },
        activation: {
          openSource: true,
          focusSource: true,
          showOverlay: true,
          verifyWindow: true,
        },
        hotkey: hotkey.trim(),
        privacy: {
          captureProtection,
          taskbarVisibility: 'shown',
          overlayCapturePolicy: overlayPolicy,
        },
        overlay: {
          alwaysOnTop: true,
          opacity: 0.92,
          width: 420,
          position: 'top-right',
        },
      };

      await onSave(input);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save workspace');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surfaceBorder rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surfaceBorder flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-textPrimary">
              {initialWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
            </h2>
            <p className="text-xs text-textSecondary mt-0.5">
              Configure activation source, global hotkey, and verified window policies.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-textPrimary p-1 rounded-lg hover:bg-surfaceBorder/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-xs px-3.5 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Technical Meeting / Architecture Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0E1422] border border-surfaceBorder rounded-lg px-3.5 py-2 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief context notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0E1422] border border-surfaceBorder rounded-lg px-3.5 py-2 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Source Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
              Source Kind
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setKind('web')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  kind === 'web'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-[#0E1422] border-surfaceBorder text-textSecondary hover:border-slate-600'
                }`}
              >
                <Globe size={14} /> Web Project
              </button>
              <button
                type="button"
                onClick={() => setKind('api')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  kind === 'api'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-[#0E1422] border-surfaceBorder text-textSecondary hover:border-slate-600'
                }`}
              >
                <Terminal size={14} /> API Provider
              </button>
              <button
                type="button"
                onClick={() => setKind('local')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  kind === 'local'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-[#0E1422] border-surfaceBorder text-textSecondary hover:border-slate-600'
                }`}
              >
                <Cpu size={14} /> Local Endpoint
              </button>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                Provider Type
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full bg-[#0E1422] border border-surfaceBorder rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-accent"
              >
                <option value="chatgpt">ChatGPT Project</option>
                <option value="claude">Claude Project</option>
                <option value="gemini">Gemini Workspace</option>
                <option value="ollama">Ollama Local</option>
                <option value="custom">Custom AI Service</option>
              </select>
            </div>

            {/* Source Target URL or Endpoint */}
            <div>
              <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                {kind === 'web' ? 'Saved Workspace URL' : 'Target Endpoint'}
              </label>
              <input
                type="url"
                required
                placeholder={kind === 'web' ? 'https://chatgpt.com/g/...' : 'http://localhost:11434'}
                value={kind === 'web' ? url : endpoint}
                onChange={(e) => (kind === 'web' ? setUrl(e.target.value) : setEndpoint(e.target.value))}
                className="w-full bg-[#0E1422] border border-surfaceBorder rounded-lg px-3.5 py-2 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Hotkey Recorder */}
          <HotkeyInput value={hotkey} onChange={setHotkey} />

          {/* Privacy & Window Capture Settings (Real capabilities only) */}
          <div className="border-t border-surfaceBorder pt-3 space-y-2">
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider">
              Privacy & Window Policies
            </label>
            <div className="flex items-center justify-between p-2.5 bg-[#0E1422] rounded-lg border border-surfaceBorder">
              <div>
                <p className="text-xs font-medium text-textPrimary">Overlay Capture Policy</p>
                <p className="text-[11px] text-textMuted mt-0.5">
                  Applies SetWindowDisplayAffinity where supported by Windows capture APIs.
                </p>
              </div>
              <select
                value={overlayPolicy}
                onChange={(e) => setOverlayPolicy(e.target.value as any)}
                className="bg-surface border border-surfaceBorder rounded px-2.5 py-1 text-xs text-textPrimary focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="exclude-when-supported">Exclude when supported</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-surfaceBorder">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Saving...' : initialWorkspace ? 'Update Workspace' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
