import { EventEmitter } from 'node:events';
import { RuntimeStateSnapshot, RuntimeStatus, VerificationReport, Workspace } from '../../shared/types';
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

  public notifyAudioState(state: any): void {
    this.emit('audio:changed', state);
    for (const win of this.activeWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_AUDIO_STATE_CHANGED, state);
      }
    }
  }
}
