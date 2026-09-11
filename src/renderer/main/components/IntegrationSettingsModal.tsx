import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { X, CheckCircle2, XCircle, RefreshCw, Terminal, Code, GitBranch, Layers } from 'lucide-react';

interface IntegrationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationSettingsModal: React.FC<IntegrationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const api = window.workspaceApi;

  const loadIntegrations = async () => {
    if (!api || !api.listIntegrations) return;
    setLoading(true);
    try {
      const list = await api.listIntegrations();
      setIntegrations(list);
    } catch (e) {
      console.error('Failed to query integration status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadIntegrations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getIntegrationIcon = (id: string) => {
    switch (id) {
      case 'vscode':
        return <Code size={18} className="text-blue-400" />;
      case 'terminal':
        return <Terminal size={18} className="text-emerald-400" />;
      case 'git':
        return <GitBranch size={18} className="text-amber-400" />;
      default:
        return <Layers size={18} className="text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-surfaceBorder rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-textPrimary">
        {/* Header */}
        <div className="p-4 border-b border-surfaceBorder flex items-center justify-between bg-[#0E1422]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">IT Application Integrations</h3>
              <p className="text-[11px] text-textMuted -mt-0.5">Desktop Application Providers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-textPrimary p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* List of Integrations */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-textSecondary font-semibold">Detected Tools on Windows</span>
            <button
              onClick={loadIntegrations}
              disabled={loading}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              Re-scan
            </button>
          </div>

          <div className="space-y-2">
            {integrations.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-surface/50 border border-surfaceBorder rounded-xl flex items-start justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#0E1422] border border-surfaceBorder">
                    {getIntegrationIcon(item.id)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-textPrimary">{item.name}</h4>
                    <p className="text-[11px] text-textMuted mt-0.5">
                      Capabilities: {item.capabilities?.join(', ') || 'None'}
                    </p>
                  </div>
                </div>

                <div>
                  {item.available ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 size={12} />
                      Detected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-textMuted bg-surface px-2 py-0.5 rounded border border-surfaceBorder">
                      <XCircle size={12} />
                      Not Found
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-textMuted italic pt-2">
            Integrations provide safe capabilities for automated workflows. Arbitrary shell or script injection is restricted by design.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surfaceBorder bg-[#0E1422] flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
