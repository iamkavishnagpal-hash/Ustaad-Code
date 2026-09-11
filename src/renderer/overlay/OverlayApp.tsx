import React, { useState, useEffect } from 'react';
import { RuntimeStateSnapshot, VerificationReport } from '../../shared/types';
import {
  Shield,
  Power,
  Layers,
  Mic,
  MicOff,
  VolumeX,
  MessageSquare,
  Sparkles,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface WorkflowExecutionState {
  workflowId: string;
  workflowName: string;
  status: 'IDLE' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  stepIndex?: number;
  totalSteps?: number;
  stepAction?: string;
  message?: string;
  error?: string;
}

export const OverlayApp: React.FC = () => {
  const [runtimeState, setRuntimeState] = useState<RuntimeStateSnapshot | null>(null);
  const [verification, setVerification] = useState<VerificationReport | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [audioLoading, setAudioLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [workflowState, setWorkflowState] = useState<WorkflowExecutionState | null>(null);

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

    const unsubLlmStart = api.onLlmStarted?.(() => {
      setAiStreaming(true);
      setAiResponse('');
    });

    const unsubLlmChunk = api.onLlmChunk?.(({ token }) => {
      setAiResponse((prev) => prev + token);
    });

    const unsubLlmComplete = api.onLlmCompleted?.(() => {
      setAiStreaming(false);
    });

    const unsubLlmError = api.onLlmError?.(({ error }) => {
      setAiStreaming(false);
      setAiResponse(`[AI Error] ${error}`);
    });

    // Phase 5: Workflow Execution Event Listeners
    const unsubWfStart = api.onWorkflowStarted?.((data) => {
      setWorkflowState({
        workflowId: data.workflowId,
        workflowName: data.workflowName,
        status: 'RUNNING',
        totalSteps: data.totalSteps,
      });
    });

    const unsubWfStepStart = api.onWorkflowStepStarted?.((data) => {
      setWorkflowState((prev) => ({
        workflowId: data.workflowId,
        workflowName: data.workflowName,
        status: 'RUNNING',
        stepIndex: data.stepIndex,
        totalSteps: data.totalSteps,
        stepAction: data.stepAction,
      }));
    });

    const unsubWfStepDone = api.onWorkflowStepCompleted?.((data) => {
      setWorkflowState((prev) => ({
        ...prev!,
        stepIndex: data.stepIndex,
        totalSteps: data.totalSteps,
        stepAction: data.stepAction,
        message: data.message,
      }));
    });

    const unsubWfComplete = api.onWorkflowCompleted?.((data) => {
      setWorkflowState((prev) => ({
        workflowId: data.workflowId,
        workflowName: data.workflowName,
        status: 'COMPLETED',
        totalSteps: data.totalSteps,
      }));
      setTimeout(() => setWorkflowState(null), 4000);
    });

    const unsubWfFailed = api.onWorkflowFailed?.((data) => {
      setWorkflowState({
        workflowId: data.workflowId,
        workflowName: data.workflowName,
        status: 'FAILED',
        error: data.error,
      });
      setTimeout(() => setWorkflowState(null), 5000);
    });

    const unsubWfCancel = api.onWorkflowCancelled?.((data) => {
      setWorkflowState({
        workflowId: data.workflowId,
        workflowName: data.workflowName,
        status: 'CANCELLED',
      });
      setTimeout(() => setWorkflowState(null), 3000);
    });

    return () => {
      unsubState();
      unsubVerify();
      if (unsubTranscript) unsubTranscript();
      if (unsubLlmStart) unsubLlmStart();
      if (unsubLlmChunk) unsubLlmChunk();
      if (unsubLlmComplete) unsubLlmComplete();
      if (unsubLlmError) unsubLlmError();
      if (unsubWfStart) unsubWfStart();
      if (unsubWfStepStart) unsubWfStepStart();
      if (unsubWfStepDone) unsubWfStepDone();
      if (unsubWfComplete) unsubWfComplete();
      if (unsubWfFailed) unsubWfFailed();
      if (unsubWfCancel) unsubWfCancel();
    };
  }, []);

  const handleAskAi = async () => {
    if (!api || aiStreaming) return;
    setAiStreaming(true);
    setAiResponse('');
    try {
      await api.requestAi();
    } catch (err: any) {
      setAiStreaming(false);
      setAiResponse(`[Request Failed] ${err.message}`);
    }
  };

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
      <div className="bg-[#0B0F19]/95 backdrop-blur-md border border-surfaceBorder rounded-xl shadow-2xl p-3 flex flex-col justify-between text-textPrimary min-h-[165px] max-h-[235px]">
        {/* Top bar with drag handle and controls */}
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
              onClick={handleAskAi}
              disabled={aiStreaming || (status !== 'READY' && status !== 'CONTEXT_READY' && status !== 'CAPTURING')}
              className="p-1 rounded text-xs transition-colors flex items-center gap-1 px-2 border bg-indigo-500/15 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/25 disabled:opacity-50"
              title="Request AI Context Synthesis (Phase 3)"
            >
              {aiStreaming ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span className="font-semibold text-[10px]">{aiStreaming ? 'Thinking...' : 'Ask AI'}</span>
            </button>
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

        {/* Phase 5 Workflow HUD Banner (When a workflow is actively executing, completed, or failed) */}
        {workflowState && (
          <div
            className={`my-1 px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
              workflowState.status === 'RUNNING'
                ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-200'
                : workflowState.status === 'COMPLETED'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/50 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {workflowState.status === 'RUNNING' && <Loader2 size={13} className="animate-spin text-cyan-400 flex-shrink-0" />}
              {workflowState.status === 'COMPLETED' && <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />}
              {workflowState.status === 'FAILED' && <XCircle size={13} className="text-red-400 flex-shrink-0" />}
              <div className="truncate">
                <span className="font-semibold uppercase tracking-wider text-[10px] block opacity-80">
                  WORKFLOW {workflowState.status}: {workflowState.workflowName}
                </span>
                <span className="text-[11px] truncate block">
                  {workflowState.status === 'RUNNING' &&
                    `Step ${workflowState.stepIndex || 1} of ${workflowState.totalSteps || 1}: ${
                      workflowState.stepAction || 'Processing...'
                    }`}
                  {workflowState.status === 'COMPLETED' && 'All steps executed successfully.'}
                  {workflowState.status === 'FAILED' && (workflowState.error || 'Execution failed')}
                </span>
              </div>
            </div>
            {workflowState.status === 'RUNNING' && (
              <button
                onClick={() => api?.cancelWorkflow(workflowState.workflowId)}
                className="text-[10px] text-cyan-300 hover:text-white px-1.5 py-0.5 border border-cyan-500/40 rounded bg-cyan-900/40"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* AI Streaming Response Viewport (when active or recently answered and no active workflow) */}
        {!workflowState && aiResponse && (
          <div className="my-1 p-2 bg-[#121829] rounded-lg border border-indigo-500/30 text-xs max-h-[70px] overflow-y-auto font-mono text-indigo-200">
            <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold mb-1">
              <Sparkles size={11} /> AI RESPONSE:
            </div>
            <p className="text-[11px] leading-relaxed whitespace-pre-wrap">
              {aiResponse}
              {aiStreaming && <span className="inline-block w-1.5 h-3 bg-indigo-400 animate-pulse ml-0.5" />}
            </p>
          </div>
        )}

        {/* Rolling Transcript Context Preview */}
        {!workflowState && !aiResponse && (
          <div className="my-1 px-2.5 py-1.5 bg-[#0E1422] rounded-lg border border-surfaceBorder/60 flex items-center gap-2 text-xs min-h-[34px]">
            <MessageSquare size={13} className="text-accent flex-shrink-0" />
            <p className="text-textSecondary text-[11px] truncate italic">
              {liveTranscript ? `"${liveTranscript}"` : 'Listening idle. Audio stream will transcribe in real-time...'}
            </p>
          </div>
        )}

        {/* Bottom Sensor Telemetry & Privacy */}
        <div className="flex items-center justify-between text-[11px] text-textMuted border-t border-surfaceBorder/40 pt-1">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${audioState?.microphone ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              MIC: {audioState?.microphone ? 'ON' : 'OFF'}
            </span>
            <span className="flex items-center gap-1 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${runtimeState?.contextPayload?.sources.screen ? 'bg-indigo-400' : 'bg-slate-600'}`} />
              SCR: {runtimeState?.contextPayload?.sources.screen ? 'ON' : 'OFF'}
            </span>
            <span className="flex items-center gap-1 font-mono text-slate-400 truncate max-w-[90px]" title={runtimeState?.activeApplication?.title}>
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
