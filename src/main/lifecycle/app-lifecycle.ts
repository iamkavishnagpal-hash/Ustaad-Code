import { app } from 'electron';
import os from 'node:os';
import { WorkspaceRuntime } from '../runtime/workspace-runtime';
import { WorkflowRuntime } from '../workflows/workflow-runtime';
import { HotkeyManager } from '../hotkeys/hotkey-manager';
import { WindowManager } from '../windows/window-manager';
import { TrayManager } from '../windows/tray-manager';
import { SQLiteBridge } from '../storage/database';
import { IntegrationRegistry } from '../integrations/integration-registry';
import { CredentialStore } from '../storage/credential-store';
import { AppSettingsStore } from '../storage/app-settings';
import { Logger } from '../utils/logger';

export type AppLifecycleState =
  | 'STARTING'
  | 'INITIALIZING'
  | 'READY'
  | 'RUNNING'
  | 'STOPPING'
  | 'EXITED';

export interface DiagnosticsReport {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  osPlatform: string;
  osRelease: string;
  databaseStatus: string;
  lifecycleState: AppLifecycleState;
  runtimeStatus: string;
  activeWorkspace?: string;
  registeredHotkeys: string[];
  integrations: { id: string; name: string; available: boolean }[];
  credentialsConfigured: { gemini: boolean; openai: boolean; ollama: boolean; anthropic: boolean };
}

export class AppLifecycleManager {
  private state: AppLifecycleState = 'STARTING';

  constructor(
    private runtime: WorkspaceRuntime,
    private workflowRuntime: WorkflowRuntime,
    private hotkeyManager: HotkeyManager,
    private windowManager: WindowManager,
    private trayManager: TrayManager,
    private db: SQLiteBridge,
    private integrationRegistry: IntegrationRegistry,
    private credentialStore: CredentialStore,
    private settingsStore: AppSettingsStore
  ) {}

  public getState(): AppLifecycleState {
    return this.state;
  }

  public setState(next: AppLifecycleState): void {
    this.state = next;
    Logger.info('lifecycle_state_changed', { state: next });
  }

  public setReady(): void {
    this.setState('RUNNING');
  }

  public async gracefulShutdown(): Promise<void> {
    if (this.state === 'STOPPING' || this.state === 'EXITED') return;

    this.setState('STOPPING');
    Logger.info('application_shutdown_initiated');

    try {
      // 1. Cancel running workflows
      this.workflowRuntime.cancelWorkflow();

      // 2. Stop live workspace runtime & context
      await this.runtime.stop();

      // 3. Unregister all global hotkeys
      this.hotkeyManager.unregisterAll();

      // 4. Close windows and overlay
      this.windowManager.overlayManager.close();
      const mainWin = this.windowManager.getMainWindow();
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.destroy();
      }

      // 5. Destroy system tray
      this.trayManager.destroy();

      // 6. Close SQLite database connection
      if (this.db && typeof this.db.close === 'function') {
        this.db.close();
      }

      Logger.info('application_shutdown_completed');
      this.setState('EXITED');
    } catch (err: any) {
      Logger.error('error_during_shutdown', err);
    } finally {
      if (app && typeof app.exit === 'function') {
        app.exit(0);
      }
    }
  }

  public async getDiagnostics(): Promise<DiagnosticsReport> {
    const snapshot = this.runtime.getSnapshot();
    const integrationStatuses = await this.integrationRegistry.getStatuses();

    let appVer = '0.3.0';
    try {
      if (app && typeof app.getVersion === 'function') {
        appVer = app.getVersion();
      }
    } catch {}

    return {
      appVersion: appVer,
      electronVersion: process.versions.electron || 'unknown',
      nodeVersion: process.versions.node || 'unknown',
      osPlatform: os.platform(),
      osRelease: os.release(),
      databaseStatus: 'CONNECTED',
      lifecycleState: this.state,
      runtimeStatus: snapshot.status,
      activeWorkspace: snapshot.activeWorkspace?.name,
      registeredHotkeys: (this.hotkeyManager as any).registeredHotkeys
        ? Array.from((this.hotkeyManager as any).registeredHotkeys.keys())
        : [],
      integrations: integrationStatuses.map((s) => ({
        id: s.id,
        name: s.name,
        available: s.available,
      })),
      credentialsConfigured: {
        gemini: this.credentialStore.getSanitizedConfig('gemini').hasApiKey,
        openai: this.credentialStore.getSanitizedConfig('openai').hasApiKey,
        ollama: !!this.credentialStore.getConfig('ollama').endpoint,
        anthropic: this.credentialStore.getSanitizedConfig('anthropic').hasApiKey,
      },
    };
  }
}
