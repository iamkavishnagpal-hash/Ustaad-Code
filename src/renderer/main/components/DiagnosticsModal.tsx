import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Activity, X, RefreshCw, CheckCircle, AlertTriangle, Monitor, Database, Key, Radio, Layers, Wrench, Shield } from 'lucide-react';

interface DiagnosticsData {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  osRelease: string;
  lifecycleState: string;
  uptimeSeconds: number;
  components: {
    sqlite: { status: string; detail?: string };
    hotkeys: { status: string; registeredCount: number };
    overlay: { status: string };
    audio: { status: string; isListening: boolean; isMuted: boolean };
    providers: { status: string; configuredCount: number };
    integrations: { status: string; availableCount: number; total: number };
    runtime: { status: string; activeWorkspace?: string };
  };
}

interface AppSettings {
  startWithWindows: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  theme: 'dark' | 'system';
  enableTelemetry: boolean;
  activeWorkspaceId?: string;
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'settings'>('diagnostics');
  const [savingSettings, setSavingSettings] = useState(false);

  const api = window.workspaceApi;

  const loadData = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const [diag, setts] = await Promise.all([
        api.getDiagnostics ? api.getDiagnostics() : null,
        api.getSettings ? api.getSettings() : null,
      ]);
      setDiagnostics(diag);
      setSettings(setts);
    } catch (err) {
      console.error('Failed to load diagnostics or settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleToggleStartWithWindows = async () => {
    if (!api || !api.updateSettings || !settings) return;
    setSavingSettings(true);
    try {
      const nextVal = !settings.startWithWindows;
      const updated = await api.updateSettings({
        startWithWindows: nextVal,
      });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update startup setting:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleCloseToTray = async () => {
    if (!api || !api.updateSettings || !settings) return;
    setSavingSettings(true);
    try {
      const nextVal = !settings.closeToTray;
      const updated = await api.updateSettings({
        closeToTray: nextVal,
      });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update closeToTray setting:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111625] border border-surfaceBorder rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surfaceBorder flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-textPrimary">System Diagnostics & Settings</h2>
              <p className="text-xs text-textMuted">Health checks, Windows lifecycle & startup preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-textPrimary p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surfaceBorder bg-[#0E1320] px-6">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'diagnostics'
                ? 'border-accent text-accent'
                : 'border-transparent text-textMuted hover:text-textPrimary'
            }`}
          >
            <Activity size={14} />
            System Health & Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-accent text-accent'
                : 'border-transparent text-textMuted hover:text-textPrimary'
            }`}
          >
            <Wrench size={14} />
            Startup & Runtime Preferences
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-textMuted gap-2">
              <RefreshCw size={18} className="animate-spin text-accent" />
              <span>Scanning subsystem states...</span>
            </div>
          ) : activeTab === 'diagnostics' && diagnostics ? (
            <div className="space-y-6">
              {/* Environment Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface/60 border border-surfaceBorder rounded-xl p-3">
                  <span className="text-[11px] text-textMuted block">App Version</span>
                  <span className="text-sm font-semibold text-textPrimary">v{diagnostics.appVersion}</span>
                </div>
                <div className="bg-surface/60 border border-surfaceBorder rounded-xl p-3">
                  <span className="text-[11px] text-textMuted block">Electron / Node</span>
                  <span className="text-sm font-semibold text-textPrimary">
                    v{diagnostics.electronVersion} / v{diagnostics.nodeVersion}
                  </span>
                </div>
                <div className="bg-surface/60 border border-surfaceBorder rounded-xl p-3">
                  <span className="text-[11px] text-textMuted block">Platform / Lifecycle</span>
                  <span className="text-sm font-semibold text-emerald-400 capitalize">
                    {diagnostics.platform} · {diagnostics.lifecycleState}
                  </span>
                </div>
              </div>

              {/* Subsystem Health Checks */}
              <div>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Subsystem Health</h3>
                <div className="space-y-2">
                  {/* SQLite */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-surfaceBorder">
                    <div className="flex items-center gap-3">
                      <Database size={16} className="text-accent" />
                      <div>
                        <div className="text-xs font-semibold text-textPrimary">SQLite WAL Storage</div>
                        <div className="text-[11px] text-textMuted">{diagnostics.components.sqlite.detail}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {diagnostics.components.sqlite.status}
                    </span>
                  </div>

                  {/* Hotkeys */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-surfaceBorder">
                    <div className="flex items-center gap-3">
                      <Radio size={16} className="text-accent" />
                      <div>
                        <div className="text-xs font-semibold text-textPrimary">Windows Global Hotkeys</div>
                        <div className="text-[11px] text-textMuted">
                          {diagnostics.components.hotkeys.registeredCount} active shortcuts registered
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {diagnostics.components.hotkeys.status}
                    </span>
                  </div>

                  {/* Audio */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-surfaceBorder">
                    <div className="flex items-center gap-3">
                      <Activity size={16} className="text-accent" />
                      <div>
                        <div className="text-xs font-semibold text-textPrimary">Live Context Audio</div>
                        <div className="text-[11px] text-textMuted">
                          {diagnostics.components.audio.isListening ? 'Listening' : 'Standby'} · Muted:{' '}
                          {diagnostics.components.audio.isMuted ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {diagnostics.components.audio.status}
                    </span>
                  </div>

                  {/* AI Providers */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-surfaceBorder">
                    <div className="flex items-center gap-3">
                      <Key size={16} className="text-accent" />
                      <div>
                        <div className="text-xs font-semibold text-textPrimary">AI Provider Gateway</div>
                        <div className="text-[11px] text-textMuted">
                          {diagnostics.components.providers.configuredCount} credentials configured
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {diagnostics.components.providers.status}
                    </span>
                  </div>

                  {/* IT Integrations */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-surfaceBorder">
                    <div className="flex items-center gap-3">
                      <Wrench size={16} className="text-accent" />
                      <div>
                        <div className="text-xs font-semibold text-textPrimary">IT Application Integrations</div>
                        <div className="text-[11px] text-textMuted">
                          {diagnostics.components.integrations.availableCount} of{' '}
                          {diagnostics.components.integrations.total} tools detected on Windows
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {diagnostics.components.integrations.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'settings' && settings ? (
            <div className="space-y-6">
              {/* Startup & Tray Options */}
              <div>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Startup & Window</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-surface/40 border border-surfaceBorder">
                    <div>
                      <div className="text-xs font-semibold text-textPrimary">Start with Windows</div>
                      <div className="text-[11px] text-textMuted">
                        Automatically launch Personal AI Workspace OS in the background when logging into Windows.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleStartWithWindows}
                      disabled={savingSettings}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.startWithWindows ? 'bg-accent' : 'bg-surfaceBorder'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.startWithWindows ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-surface/40 border border-surfaceBorder">
                    <div>
                      <div className="text-xs font-semibold text-textPrimary">Close to System Tray</div>
                      <div className="text-[11px] text-textMuted">
                        When closing the workspace window, keep the app running in the Windows tray for global hotkey
                        triggers.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleCloseToTray}
                      disabled={savingSettings}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.closeToTray ? 'bg-accent' : 'bg-surfaceBorder'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.closeToTray ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Security & Privacy info */}
              <div>
                <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Security & Privacy</h3>
                <div className="p-4 rounded-xl bg-surface/40 border border-surfaceBorder space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Shield size={16} />
                    <span>Windows SafeStorage (DPAPI) Protected</span>
                  </div>
                  <p className="text-[11px] text-textMuted leading-relaxed">
                    All provider credentials and API tokens are encrypted with Windows DPAPI encryption before storing to
                    disk. Logs automatically redact authorization tokens, API keys, and sensitive payloads.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surfaceBorder bg-[#0E1320] flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={loadData}
            disabled={loading}
            className="text-textMuted hover:text-textPrimary"
          >
            Refresh Diagnostics
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
