import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/events';
import { RuntimeStateSnapshot, VerificationReport, Workspace, WorkspaceInput } from '../shared/types';

export const workspaceApi = {
  // Workspaces CRUD
  listWorkspaces: (): Promise<Workspace[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST);
  },
  getWorkspace: (id: string): Promise<Workspace | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET, id);
  },
  createWorkspace: (input: WorkspaceInput): Promise<Workspace> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE, input);
  },
  updateWorkspace: (id: string, input: Partial<WorkspaceInput>): Promise<Workspace> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_UPDATE, { id, input });
  },
  deleteWorkspace: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_DELETE, id);
  },

  // Hotkey helper
  validateHotkey: (hotkey: string): Promise<{ normalized: string; available: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HOTKEY_VALIDATE, hotkey);
  },

  // Runtime control
  getRuntimeState: (): Promise<RuntimeStateSnapshot> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_GET_STATE);
  },
  activateWorkspace: (workspaceId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_ACTIVATE_WORKSPACE, workspaceId);
  },
  stopRuntime: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_STOP);
  },

  // Window actions
  minimizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE);
  },
  closeWindow: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE);
  },

  // Event subscriptions
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
};

contextBridge.exposeInMainWorld('workspaceApi', workspaceApi);
