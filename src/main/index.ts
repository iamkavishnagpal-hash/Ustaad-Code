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
import { registerIpcHandlers } from './ipc/handlers';

// Enforce single instance lock on Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let windowManager: WindowManager | null = null;
let hotkeyManager: HotkeyManager | null = null;
let runtime: WorkspaceRuntime | null = null;

async function bootstrap(): Promise<void> {
  // 1. Initialize SQLite Database
  const db = new SQLiteBridge();
  const workspaceStore = new WorkspaceStore(db);
  const sessionStore = new SessionStore(db);

  // 2. Initialize Services & Managers
  const workspaceService = new WorkspaceService(workspaceStore);
  const launcher = new WorkspaceLauncher();
  const verifier = new WorkspaceVerifier();
  windowManager = new WindowManager();
  const privacyManager = new PrivacyManager();
  hotkeyManager = new HotkeyManager();
  const eventsBus = new RuntimeEventsBus();

  // Phase 2 Live Context Services
  const audioManager = new AudioManager();
  const transcriptionManager = new TranscriptionManager();
  const contextManager = new ContextManager();

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
    contextManager
  );

  // 4. Register IPC endpoints
  registerIpcHandlers(workspaceService, runtime, hotkeyManager);

  // 5. Create Main Settings Window
  const mainWindow = windowManager.createMainWindow();
  eventsBus.registerWindow(mainWindow);

  // 6. Bind all registered workspaces hotkeys
  runtime.initializeHotkeys();

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
