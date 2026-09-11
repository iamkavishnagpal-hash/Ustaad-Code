import React, { useState, useEffect } from 'react';
import { RuntimeStateSnapshot, VerificationReport } from '../../shared/types';
import { Shield, Power, CheckCircle, AlertTriangle, Layers, Mic, MicOff, VolumeX, MessageSquare } from 'lucide-react';

export const OverlayApp: React.FC = () => {
  const [runtimeState, setRuntimeState] = useState<RuntimeStateSnapshot | null>(null);
  const [verification, setVerification] = useState<VerificationReport | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [audioLoading, setAudioLoading] = useState(false);

  const api = window.overlayApi;

  useEffect(() => {
    if (!api) return;

    api.getRuntimeState().then((state) => {
      setRuntimeState(state);
      setVerification(state.verificationReport);
      if (state.recentTranscript) {
        setLiveTranscript(state.recentTranscript);
      }
    });

    const unsubState = api.onStateChanged((state) => {
      setRuntimeState(state);
      if (state.verificationReport) {
        setVerification(state.verificationReport);
      }
      if (state.recentTranscript) {
        setLiveTranscript(state.recentTranscript);
      }
    });

    const unsubVerify = api.onVerificationUpdated((report) => {
      setVerification(report);
    });

    const unsubTranscript = api.onTranscriptChunk?.((segment) => {
      setLiveTranscript(segment.text);
    });

    return () => {
      unsubState();
      unsubVerify();
      if (unsubTranscript) unsubTranscript();
    };
  }, []);

  const handleStop = async () => {
    if (!api) return;
    await api.stopRuntime();
  };

  const handleToggleListen = async () => {
    if (!api || audioLoading) return;
    setAudioLoading(true);
    try {
      if (runtimeState?.audioState?.microphone) {
        await api.stopListening();
      } else {
        await api.startListening();
      }
    } catch (err) {
      console.error('Audio toggle error:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleToggleMute = async () => {
    if (!api) return;
    await api.toggleMute();
  };

  const status = runtimeState?.status || 'IDLE';
  const workspace = runtimeState?.activeWorkspace;
  const audioState = runtimeState?.audioState;

  const getStatusBadge = () => {
    switch (status) {
      case 'READY':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            READY
          </span>
        );
      case 'CAPTURING':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            CAPTURING
          </span>
        );
      case 'TRANSCRIBING':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            TRANSCRIBING
          </span>
        );
      case 'CONTEXT_READY':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            CONTEXT_READY
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
      <div className="bg-[#0B0F19]/95 backdrop-blur-md border border-surfaceBorder rounded-xl shadow-2xl p-3 flex flex-col justify-between text-textPrimary h-[160px]">
        {/* Top bar with drag handle and close control */}
        <div className="flex items-center justify-between drag-region cursor-move">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Layers size={12} />
            </div>
            <span className="text-xs font-semibold text-textPrimary truncate max-w-[170px]">
              {workspace?.name || 'Workspace OS'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 no-drag">
            {getStatusBadge()}
            <button
              onClick={handleToggleListen}
              disabled={audioLoading}
              className={`p-1 rounded text-xs transition-colors flex items-center gap-1 px-2 border ${
                audioState?.microphone
                  ? 'bg-danger/15 border-danger/40 text-danger hover:bg-danger/25'
                  : 'bg-accent/15 border-accent/40 text-accent hover:bg-accent/25'
              }`}
              title={audioState?.microphone ? 'Stop Listening' : 'Start Listening'}
            >
              {audioState?.microphone ? <MicOff size={13} /> : <Mic size={13} />}
              <span className="font-semibold text-[10px]">{audioState?.microphone ? 'Stop' : 'Listen'}</span>
            </button>
            {audioState?.microphone && (
              <button
                onClick={handleToggleMute}
                className={`p-1 rounded text-xs transition-colors ${
                  audioState?.muted ? 'text-amber-400 bg-amber-400/10' : 'text-textMuted hover:text-textPrimary'
                }`}
                title="Toggle Mute"
              >
                <VolumeX size={13} />
              </button>
            )}
            <button
              onClick={handleStop}
              className="text-textMuted hover:text-danger hover:bg-danger/10 p-1 rounded transition-colors"
              title="Deactivate Runtime Session"
            >
              <Power size={13} />
            </button>
          </div>
        </div>

        {/* Rolling Transcript Context Preview */}
        <div className="my-1 px-2.5 py-1.5 bg-[#0E1422] rounded-lg border border-surfaceBorder/60 flex items-center gap-2 text-xs min-h-[34px]">
          <MessageSquare size={13} className="text-accent flex-shrink-0" />
          <p className="text-textSecondary text-[11px] truncate italic">
            {liveTranscript ? `"${liveTranscript}"` : 'Listening idle. Audio stream will transcribe in real-time...'}
          </p>
        </div>

        {/* Bottom Sensor Telemetry & Privacy */}
        <div className="flex items-center justify-between text-[11px] text-textMuted border-t border-surfaceBorder/40 pt-1">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${audioState?.microphone ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              MIC: {audioState?.microphone ? 'ON' : 'OFF'}
            </span>
            <span className="flex items-center gap-1 font-mono text-slate-400 truncate max-w-[110px]" title={runtimeState?.activeApplication?.title}>
              APP: {runtimeState?.activeApplication?.processName || 'System'}
            </span>
            <span className="flex items-center gap-1 font-mono text-slate-500" title={audioState?.systemAudioNotice}>
              SYS: OFF
            </span>
          </div>

          <div className="flex items-center gap-1 text-textSecondary text-[10px]" title={verification?.privacyNotice}>
            <Shield size={11} className={verification?.privacyPolicyApplied ? 'text-emerald-400' : 'text-slate-400'} />
            <span className="truncate max-w-[80px]">
              {verification?.privacyPolicyApplied ? 'Protected' : 'Normal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
