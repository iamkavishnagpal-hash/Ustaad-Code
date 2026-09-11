import React, { useState, useEffect } from 'react';
import { RuntimeStateSnapshot, VerificationReport } from '../../shared/types';
import { Shield, Power, CheckCircle, AlertTriangle, Layers, ExternalLink } from 'lucide-react';

export const OverlayApp: React.FC = () => {
  const [runtimeState, setRuntimeState] = useState<RuntimeStateSnapshot | null>(null);
  const [verification, setVerification] = useState<VerificationReport | null>(null);

  const api = window.overlayApi;

  useEffect(() => {
    if (!api) return;

    api.getRuntimeState().then((state) => {
      setRuntimeState(state);
      setVerification(state.verificationReport);
    });

    const unsubState = api.onStateChanged((state) => {
      setRuntimeState(state);
      if (state.verificationReport) {
        setVerification(state.verificationReport);
      }
    });

    const unsubVerify = api.onVerificationUpdated((report) => {
      setVerification(report);
    });

    return () => {
      unsubState();
      unsubVerify();
    };
  }, []);

  const handleStop = async () => {
    if (!api) return;
    await api.stopRuntime();
  };

  const status = runtimeState?.status || 'IDLE';
  const workspace = runtimeState?.activeWorkspace;

  const getStatusBadge = () => {
    switch (status) {
      case 'READY':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            READY
          </span>
        );
      case 'OPENING_SOURCE':
      case 'ACTIVATING':
      case 'VERIFYING':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            {status}
          </span>
        );
      case 'ERROR':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20">
            <AlertTriangle size={12} />
            ERROR
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-textMuted bg-surface px-2 py-0.5 rounded border border-surfaceBorder">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full p-2">
      <div className="bg-[#0B0F19]/95 backdrop-blur-md border border-surfaceBorder rounded-xl shadow-2xl p-3.5 flex flex-col justify-between text-textPrimary h-[140px]">
        {/* Top bar with drag handle and close control */}
        <div className="flex items-center justify-between drag-region cursor-move">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Layers size={12} />
            </div>
            <span className="text-xs font-semibold text-textPrimary truncate max-w-[200px]">
              {workspace?.name || 'Workspace OS'}
            </span>
          </div>

          <div className="flex items-center gap-2 no-drag">
            {getStatusBadge()}
            <button
              onClick={handleStop}
              className="text-textMuted hover:text-danger hover:bg-danger/10 p-1 rounded transition-colors"
              title="Deactivate Runtime Session"
            >
              <Power size={14} />
            </button>
          </div>
        </div>

        {/* Center telemetry: Active source URL & Shortcut */}
        <div className="my-1.5 px-2 py-1.5 bg-[#0E1422] rounded-lg border border-surfaceBorder/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate max-w-[280px]">
            <ExternalLink size={13} className="text-accent flex-shrink-0" />
            <span className="text-textSecondary truncate font-mono text-[11px]">
              {workspace?.source.url || workspace?.source.endpoint || 'No target configured'}
            </span>
          </div>
          {workspace?.hotkey && (
            <span className="px-1.5 py-0.5 bg-surface border border-surfaceBorder rounded text-[10px] font-mono text-accent">
              {workspace.hotkey}
            </span>
          )}
        </div>

        {/* Bottom verification and privacy status */}
        <div className="flex items-center justify-between text-[11px] text-textMuted border-t border-surfaceBorder/40 pt-1.5">
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle size={12} />
            <span>{verification?.passed ? 'Source Verified' : runtimeState?.statusMessage || 'Initializing...'}</span>
          </div>

          <div className="flex items-center gap-1 text-textSecondary" title={verification?.privacyNotice}>
            <Shield size={12} className={verification?.privacyPolicyApplied ? 'text-emerald-400' : 'text-slate-400'} />
            <span className="truncate max-w-[120px]">
              {verification?.privacyPolicyApplied ? 'Protected' : 'Normal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
