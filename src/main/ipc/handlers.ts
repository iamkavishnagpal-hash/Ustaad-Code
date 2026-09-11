import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/events';
import { WorkspaceService } from '../workspaces/workspace-service';
import { WorkspaceRuntime } from '../runtime/workspace-runtime';
import { HotkeyManager } from '../hotkeys/hotkey-manager';
import { WorkspaceInputSchema } from '../../shared/schemas';

export function registerIpcHandlers(
  workspaceService: WorkspaceService,
  runtime: WorkspaceRuntime,
  hotkeyManager: HotkeyManager
): void {
  // 1. Workspace CRUD
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_LIST, async () => {
    return workspaceService.listWorkspaces();
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET, async (_event, id: string) => {
    return workspaceService.getWorkspace(id);
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_CREATE, async (_event, rawInput: unknown) => {
    const validated = WorkspaceInputSchema.parse(rawInput);
    const workspace = workspaceService.createWorkspace(validated);
    runtime.bindWorkspaceHotkey(workspace);
    return workspace;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_UPDATE, async (_event, { id, input }: { id: string; input: unknown }) => {
    const validated = WorkspaceInputSchema.partial().parse(input);
    const existing = workspaceService.getWorkspace(id);
    if (existing && existing.hotkey) {
      runtime.unbindWorkspaceHotkey(existing.hotkey);
    }
    const updated = workspaceService.updateWorkspace(id, validated);
    runtime.bindWorkspaceHotkey(updated);
    return updated;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, async (_event, id: string) => {
    const existing = workspaceService.getWorkspace(id);
    if (existing && existing.hotkey) {
      runtime.unbindWorkspaceHotkey(existing.hotkey);
    }
    return workspaceService.deleteWorkspace(id);
  });

  // 2. Hotkeys validation
  ipcMain.handle(IPC_CHANNELS.HOTKEY_VALIDATE, async (_event, rawHotkey: string) => {
    const normalized = hotkeyManager.normalizeAccelerator(rawHotkey);
    const isAlreadyInUse = hotkeyManager.isRegistered(normalized);
    return {
      normalized,
      available: !isAlreadyInUse,
    };
  });

  // 3. Runtime orchestration
  ipcMain.handle(IPC_CHANNELS.RUNTIME_GET_STATE, async () => {
    return runtime.getSnapshot();
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME_ACTIVATE_WORKSPACE, async (_event, workspaceId: string) => {
    return runtime.activateWorkspace(workspaceId);
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME_STOP, async () => {
    return runtime.stop();
  });

  // 4. Live Context & Audio (Phase 2)
  ipcMain.handle(IPC_CHANNELS.AUDIO_START_LISTENING, async () => {
    return runtime.startListening();
  });

  ipcMain.handle(IPC_CHANNELS.AUDIO_STOP_LISTENING, async () => {
    return runtime.stopListening();
  });

  ipcMain.handle(IPC_CHANNELS.AUDIO_TOGGLE_MUTE, async () => {
    return runtime.toggleMute();
  });

  ipcMain.handle(IPC_CHANNELS.CONTEXT_GET_CURRENT, async () => {
    return runtime.getSnapshot();
  });

  // 4. Window control
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });
}
