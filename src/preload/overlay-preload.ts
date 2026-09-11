import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/events';
import { RuntimeStateSnapshot, VerificationReport } from '../shared/types';

export const overlayApi = {
  getRuntimeState: (): Promise<RuntimeStateSnapshot> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_GET_STATE);
  },
  stopRuntime: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_STOP);
  },

  // Audio & Live Context (Phase 2)
  startListening: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDIO_START_LISTENING);
  },
  stopListening: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDIO_STOP_LISTENING);
  },
  toggleMute: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDIO_TOGGLE_MUTE);
  },

  // AI Response (Phase 3)
  requestAi: (prompt?: string, providerId?: string): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LLM_REQUEST_AI, { prompt, providerId });
  },

  // Event Subscriptions
  onStateChanged: (callback: (snapshot: RuntimeStateSnapshot) => void) => {
    const handler = (_event: any, snapshot: RuntimeStateSnapshot) => callback(snapshot);
    ipcRenderer.on(IPC_CHANNELS.EVENT_RUNTIME_STATE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_RUNTIME_STATE_CHANGED, handler);
  },
  onVerificationUpdated: (callback: (report: VerificationReport) => void) => {
    const handler = (_event: any, report: VerificationReport) => callback(report);
    ipcRenderer.on(IPC_CHANNELS.EVENT_VERIFICATION_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_VERIFICATION_UPDATED, handler);
  },
  onTranscriptChunk: (callback: (segment: any) => void) => {
    const handler = (_event: any, segment: any) => callback(segment);
    ipcRenderer.on(IPC_CHANNELS.EVENT_TRANSCRIPT_CHUNK, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_TRANSCRIPT_CHUNK, handler);
  },
  onLlmStarted: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.EVENT_LLM_STARTED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_LLM_STARTED, handler);
  },
  onLlmChunk: (callback: (data: { token: string; providerId: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.EVENT_LLM_CHUNK, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_LLM_CHUNK, handler);
  },
  onLlmCompleted: (callback: (response: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.EVENT_LLM_COMPLETED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_LLM_COMPLETED, handler);
  },
  onLlmError: (callback: (errorData: { providerId: string; error: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.EVENT_LLM_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_LLM_ERROR, handler);
  },
};

contextBridge.exposeInMainWorld('overlayApi', overlayApi);

