import { app, BrowserWindow } from 'electron';
import { SQLiteBridge } from './storage/database';
import { WorkspaceStore } from './storage/workspace-store';
import { SessionStore } from './storage/session-store';
import { WorkspaceService } from './workspaces/workspace-service';
import { WorkspaceLauncher } from './workspaces/workspace-launcher';
import { WorkspaceVerifier } from './workspaces/workspace-verifier';
import { WindowManager } from './windows/window-manager';
import { PrivacyManager } from './privacy/privacy-manager';
import { HotkeyManager } from './hotkeys/hotkey-manager';
import { RuntimeEventsBus } from './runtime/runtime-events';
import { WorkspaceRuntime } from './runtime/workspace-runtime';
import { AudioManager } from './audio/audio-manager';
import { TranscriptionManager } from './transcription/transcription-manager';
import { ContextManager } from './context/context-manager';
import { ProviderRegistry } from './providers/provider-registry';
import { CredentialStore } from './storage/credential-store';
import { ProviderGateway } from './providers/provider-gateway';
import { WorkflowStore } from './workflows/workflow-store';
import { ActionRegistry } from './workflows/action-registry';
import { WorkflowRuntime as DesktopWorkflowRuntime } from './workflows/workflow-runtime';
import { WorkflowEventsBus } from './workflows/workflow-events';
import { IntegrationRegistry } from './integrations/integration-registry';
import { VsCodeIntegration } from './integrations/vscode/vscode-integration';
import { TerminalIntegration } from './integrations/terminal/terminal-integration';
import { GitIntegration } from './integrations/git/git-integration';

import { registerIpcHandlers } from './ipc/handlers';

// Enforce single instance lock on Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let windowManager: WindowManager | null = null;
let hotkeyManager: HotkeyManager | null = null;
let runtime: WorkspaceRuntime | null = null;
let workflowRuntime: DesktopWorkflowRuntime | null = null;

async function bootstrap(): Promise<void> {
  // 1. Initialize SQLite Database
  const db = new SQLiteBridge();
  const workspaceStore = new WorkspaceStore(db);
  const sessionStore = new SessionStore(db);
  const workflowStore = new WorkflowStore(db);

  // 2. Initialize Services & Managers
  const workspaceService = new WorkspaceService(workspaceStore);
  const launcher = new WorkspaceLauncher();
  const verifier = new WorkspaceVerifier();
  windowManager = new WindowManager();
  const privacyManager = new PrivacyManager();
  hotkeyManager = new HotkeyManager();
  const eventsBus = new RuntimeEventsBus();
  const workflowEventsBus = new WorkflowEventsBus();

  // Pipe workflow events into RuntimeEventsBus for client windows
  workflowEventsBus.on('workflow:started', (p) => eventsBus.notifyWorkflowStarted(p));
  workflowEventsBus.on('workflow:step-started', (p) => eventsBus.notifyWorkflowStepStarted(p));
  workflowEventsBus.on('workflow:step-completed', (p) => eventsBus.notifyWorkflowStepCompleted(p));
  workflowEventsBus.on('workflow:completed', (p) => eventsBus.notifyWorkflowCompleted(p));
  workflowEventsBus.on('workflow:failed', (p) => eventsBus.notifyWorkflowFailed(p));
  workflowEventsBus.on('workflow:cancelled', (p) => eventsBus.notifyWorkflowCancelled(p));

  // Phase 2 Live Context Services
  const audioManager = new AudioManager();
  const transcriptionManager = new TranscriptionManager();
  const contextManager = new ContextManager();

  // Phase 3 AI Provider Gateway
  const providerRegistry = new ProviderRegistry();
  const credentialStore = new CredentialStore();
  const providerGateway = new ProviderGateway(providerRegistry, credentialStore);

  // 3. Initialize Runtime
  runtime = new WorkspaceRuntime(
    workspaceService,
    launcher,
    verifier,
    windowManager,
    privacyManager,
    hotkeyManager,
    sessionStore,
    eventsBus,
    audioManager,
    transcriptionManager,
    contextManager,
    undefined,
    providerGateway
  );

  // Phase 6 IT Application Integration Runtime
  const integrationRegistry = new IntegrationRegistry();
  integrationRegistry.register(new VsCodeIntegration());
  integrationRegistry.register(new TerminalIntegration());
  integrationRegistry.register(new GitIntegration());

  // Phase 5 Workflow & Action Runtime
  const actionRegistry = new ActionRegistry(runtime, integrationRegistry);
  workflowRuntime = new DesktopWorkflowRuntime(
    workflowStore,
    actionRegistry,
    runtime,
    hotkeyManager,
    workflowEventsBus
  );

  // 4. Register IPC endpoints
  registerIpcHandlers(
    workspaceService,
    runtime,
    hotkeyManager,
    workflowStore,
    workflowRuntime,
    integrationRegistry
  );

  // 5. Create Main Settings Window
  const mainWindow = windowManager.createMainWindow();
  eventsBus.registerWindow(mainWindow);

  // 6. Bind all registered workspaces and workflows hotkeys
  runtime.initializeHotkeys();
  workflowRuntime.initializeHotkeys();

  // Handle focus when second instance is requested
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // On Windows, keep running in tray / background for hotkeys unless explicitly terminated
  // But for Phase 1 dev convenience, if all windows close and no active session, quit:
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (hotkeyManager) {
    hotkeyManager.unregisterAll();
  }
});
