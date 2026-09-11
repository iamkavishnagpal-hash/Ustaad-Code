import { app, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { WindowManager } from './window-manager';
import { WorkspaceRuntime } from '../runtime/workspace-runtime';
import { Logger } from '../utils/logger';

export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private windowManager: WindowManager,
    private runtime: WorkspaceRuntime,
    private onQuit: () => void
  ) {}

  public initialize(): void {
    if (this.tray) return;

    try {
      // Create a clean 16x16 icon for the Windows system tray
      const icon = nativeImage.createFromBuffer(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAD9JREFUOE9jZKAQMFKon2H4f+p/BqYRJmI00tQwMGAahk8xYjRgNGB4GjA0wxh4wAEvRmMzAI/XGBiQ5vCqBgCP2RAxD1R1bQAAAABJRU5ErkJggg==',
          'base64'
        )
      );

      this.tray = new Tray(icon);
      this.tray.setToolTip('Personal AI Workspace OS');

      this.updateContextMenu();

      this.tray.on('double-click', () => {
        this.openWorkspaceManager();
      });

      Logger.info('tray_initialized');
    } catch (err: any) {
      Logger.warn('tray_init_failed', { error: err?.message });
    }
  }

  public updateContextMenu(): void {
    if (!this.tray) return;

    const snapshot = this.runtime.getSnapshot();
    const activeWs = snapshot.activeWorkspace;
    const isRunning = snapshot.status !== 'IDLE';

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Personal AI Workspace OS',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: activeWs ? `Active: ${activeWs.name} (${snapshot.status})` : 'Runtime Idle',
        enabled: false,
      },
      {
        label: 'Open Workspace Manager',
        click: () => this.openWorkspaceManager(),
      },
      {
        label: isRunning ? 'Pause Runtime' : 'Stop Runtime',
        enabled: isRunning,
        click: async () => {
          await this.runtime.stop();
          this.updateContextMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Exit Application',
        click: () => {
          this.destroy();
          this.onQuit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public openWorkspaceManager(): void {
    const win = this.windowManager.createMainWindow();
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      Logger.info('tray_destroyed');
    }
  }
}
