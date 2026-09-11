import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Cpu, CheckCircle, AlertTriangle, Key, Server, Loader2 } from 'lucide-react';

export const ProviderSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [providers, setProviders] = useState<{ id: string; name: string; defaultModel: string }[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [model, setModel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ available: boolean; error?: string; latencyMs?: number } | null>(null);
  const [savedStatus, setSavedStatus] = useState(false);

  const api = window.workspaceApi;

  useEffect(() => {
    if (!isOpen || !api) return;

    api.listProviders().then((list) => {
      setProviders(list);
      if (list.length > 0 && !selectedProvider) {
        setSelectedProvider(list[0].id);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!api || !selectedProvider) return;

    setTestResult(null);
    setSavedStatus(false);
    setApiKey('');

    api.getProviderConfig(selectedProvider).then((cfg) => {
      if (cfg) {
        setModel(cfg.model || '');
        setEndpoint(cfg.endpoint || (selectedProvider === 'ollama' ? 'http://127.0.0.1:11434' : ''));
        setHasExistingKey(cfg.hasApiKey);
      }
    });
  }, [selectedProvider]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!api) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.testProviderConnection(selectedProvider, {
        model,
        endpoint,
        apiKey: apiKey || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        available: false,
        error: err?.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    await api.saveProviderConfig({
      providerId: selectedProvider,
      model,
      endpoint: endpoint || undefined,
      apiKey: apiKey || undefined,
    });

    setSavedStatus(true);
    setHasExistingKey(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-surfaceBorder rounded-2xl w-full max-w-lg shadow-2xl p-6 text-textPrimary">
        <div className="flex items-center justify-between pb-4 border-b border-surfaceBorder/60">
          <div className="flex items-center gap-2">
            <Cpu className="text-accent" size={20} />
            <h2 className="text-lg font-bold">AI Provider Settings</h2>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary text-sm font-semibold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          {/* Provider Select */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Active Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-[#1e293b] border border-surfaceBorder rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-accent"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gemini-1.5-flash, gpt-4o-mini, llama3.2"
              className="w-full bg-[#1e293b] border border-surfaceBorder rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-accent"
              required
            />
          </div>

          {/* Endpoint (for Ollama) */}
          {selectedProvider === 'ollama' && (
            <div>
              <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                Ollama Endpoint
              </label>
              <div className="relative">
                <Server size={14} className="absolute left-3 top-3 text-textMuted" />
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full bg-[#1e293b] border border-surfaceBorder rounded-lg pl-9 pr-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* API Key (for Cloud Providers) */}
          {selectedProvider !== 'ollama' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                  API Key
                </label>
                {hasExistingKey && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Secure key configured
                  </span>
                )}
              </div>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-3 text-textMuted" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? 'Leave blank to keep existing key' : 'Enter API Key (stored in secure memory)'}
                  className="w-full bg-[#1e293b] border border-surfaceBorder rounded-lg pl-9 pr-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-accent"
                />
              </div>
              <p className="text-[11px] text-textMuted mt-1">
                Keys are held in protected memory in the main process and never stored in plaintext SQLite.
              </p>
            </div>
          )}

          {/* Test connection report */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                testResult.available
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.available ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                <span>
                  {testResult.available
                    ? `Connected successfully (${testResult.latencyMs}ms)`
                    : testResult.error || 'Connection rejected'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-surfaceBorder/60">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>

            <div className="flex items-center gap-2">
              {savedStatus && <span className="text-xs text-emerald-400 font-semibold">Saved!</span>}
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button type="submit">Save Provider</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
