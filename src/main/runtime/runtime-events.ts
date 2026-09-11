import { EventEmitter } from 'node:events';
import { RuntimeStateSnapshot, VerificationReport } from '../../shared/types';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/events';

export class RuntimeEventsBus extends EventEmitter {
  private activeWindows: Set<BrowserWindow> = new Set();

  public registerWindow(win: BrowserWindow): void {
    this.activeWindows.add(win);
    win.on('closed', () => {
      this.activeWindows.delete(win);
    });
  }

  public broadcastState(snapshot: RuntimeStateSnapshot): void {
    this.emit('state:changed', snapshot);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_RUNTIME_STATE_CHANGED, snapshot);
      }
    }
  }

  public notifyHotkeyTriggered(hotkey: string, workspaceId: string): void {
    this.emit('hotkey:triggered', { hotkey, workspaceId });
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_HOTKEY_TRIGGERED, { hotkey, workspaceId });
      }
    }
  }

  public notifyVerification(report: VerificationReport): void {
    this.emit('verification:completed', report);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_VERIFICATION_UPDATED, report);
      }
    }
  }

  public notifyTranscript(segment: any): void {
    this.emit('transcript:chunk', segment);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_TRANSCRIPT_CHUNK, segment);
      }
    }
  }

  public notifyContext(context: any): void {
    this.emit('context:updated', context);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_CONTEXT_UPDATED, context);
      }
    }
  }

  public notifyAudioState(audioState: any): void {
    this.emit('audio:changed', audioState);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_AUDIO_STATE_CHANGED, audioState);
      }
    }
  }

  public notifyLlmStarted(data: { providerId: string; model: string }): void {
    this.emit('llm:started', data);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_LLM_STARTED, data);
      }
    }
  }

  public notifyLlmChunk(data: { token: string; providerId: string }): void {
    this.emit('llm:chunk', data);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_LLM_CHUNK, data);
      }
    }
  }

  public notifyLlmCompleted(response: any): void {
    this.emit('llm:completed', response);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_LLM_COMPLETED, response);
      }
    }
  }

  public notifyLlmError(errorData: { providerId: string; error: string }): void {
    this.emit('llm:error', errorData);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_LLM_ERROR, errorData);
      }
    }
  }

  // Workflow notifications (Phase 5)
  public notifyWorkflowStarted(payload: any): void {
    this.emit('workflow:started', payload);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_WORKFLOW_STARTED, payload);
      }
    }
  }

  public notifyWorkflowStepStarted(payload: any): void {
    this.emit('workflow:step-started', payload);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_WORKFLOW_STEP_STARTED, payload);
      }
    }
  }

  public notifyWorkflowStepCompleted(payload: any): void {
    this.emit('workflow:step-completed', payload);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_WORKFLOW_STEP_COMPLETED, payload);
      }
    }
  }

  public notifyWorkflowCompleted(payload: any): void {
    this.emit('workflow:completed', payload);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_WORKFLOW_COMPLETED, payload);
      }
    }
  }

  public notifyWorkflowFailed(payload: any): void {
    this.emit('workflow:failed', payload);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_WORKFLOW_FAILED, payload);
      }
    }
  }

  public notifyWorkflowCancelled(payload: any): void {
    this.emit('workflow:cancelled', payload);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_WORKFLOW_CANCELLED, payload);
      }
    }
  }
}
