import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { SQLiteBridge } from '../../src/main/storage/database';
import { WorkspaceStore } from '../../src/main/storage/workspace-store';
import { SessionStore } from '../../src/main/storage/session-store';
import { WorkspaceService } from '../../src/main/workspaces/workspace-service';
import { WorkspaceLauncher } from '../../src/main/workspaces/workspace-launcher';
import { WorkspaceVerifier } from '../../src/main/workspaces/workspace-verifier';
import { WindowManager } from '../../src/main/windows/window-manager';
import { PrivacyManager } from '../../src/main/privacy/privacy-manager';
import { HotkeyManager } from '../../src/main/hotkeys/hotkey-manager';
import { RuntimeEventsBus } from '../../src/main/runtime/runtime-events';
import { AudioManager } from '../../src/main/audio/audio-manager';
import { TranscriptionManager } from '../../src/main/transcription/transcription-manager';
import { ContextManager } from '../../src/main/context/context-manager';
import { WorkspaceRuntime } from '../../src/main/runtime/workspace-runtime';
import { Workspace } from '../../src/shared/types';

describe('WorkspaceRuntime Integration', () => {
  const testDbPath = path.join(process.cwd(), 'test-runtime-integ.db');
  let db: SQLiteBridge;
  let workspaceStore: WorkspaceStore;
  let sessionStore: SessionStore;
  let workspaceService: WorkspaceService;
  let launcher: WorkspaceLauncher;
  let verifier: WorkspaceVerifier;
  let windowManager: WindowManager;
  let privacyManager: PrivacyManager;
  let hotkeyManager: HotkeyManager;
  let eventsBus: RuntimeEventsBus;
  let audioManager: AudioManager;
  let transcriptionManager: TranscriptionManager;
  let contextManager: ContextManager;
  let runtime: WorkspaceRuntime;

  const mockWorkspace: Workspace = {
    id: 'ws-integ-1',
    name: 'Data Engineering Workspace',
    description: 'Integration test workspace',
    source: {
      kind: 'web',
      provider: 'chatgpt',
      url: 'https://chatgpt.com',
    },
    activation: {
      openSource: true,
      focusSource: true,
      showOverlay: true,
      verifyWindow: true,
    },
    hotkey: 'Ctrl+Shift+H',
    privacy: {
      captureProtection: true,
      taskbarVisibility: 'hidden',
      overlayCapturePolicy: 'exclude-when-supported',
    },
    overlay: {
      alwaysOnTop: true,
      opacity: 0.95,
      width: 380,
      position: 'top-right',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new SQLiteBridge(testDbPath);
    workspaceStore = new WorkspaceStore(db);
    sessionStore = new SessionStore(db);
    workspaceService = new WorkspaceService(workspaceStore);
    launcher = new WorkspaceLauncher();
    verifier = new WorkspaceVerifier();
    windowManager = new WindowManager();
    privacyManager = new PrivacyManager();
    hotkeyManager = new HotkeyManager();
    eventsBus = new RuntimeEventsBus();
    audioManager = new AudioManager();
    transcriptionManager = new TranscriptionManager();
    contextManager = new ContextManager();

    // Mock launcher to avoid actual shell.openExternal in tests
    vi.spyOn(launcher, 'launchSource').mockResolvedValue({
      success: true,
      sourceUrl: 'https://chatgpt.com',
      opened: true,
      focused: true,
    });

    // Mock window creation
    const mockWindow = {
      isDestroyed: () => false,
      webContents: { send: vi.fn(), isDestroyed: () => false },
      setContentProtection: vi.fn(),
      setSkipTaskbar: vi.fn(),
      on: vi.fn(),
    } as any;

    vi.spyOn(windowManager.overlayManager, 'createOrGetOverlay').mockReturnValue(mockWindow);

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
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
    vi.restoreAllMocks();
  });

  it('runs complete lifecycle: Workspace -> Runtime -> Session -> Verification -> READY -> IDLE', async () => {
    // 1. Create workspace in SQLite
    const created = workspaceService.createWorkspace(mockWorkspace);
    expect(created.id).toBeDefined();

    // 2. Initial state
    let snapshot = runtime.getSnapshot();
    expect(snapshot.status).toBe('IDLE');

    // 3. Activate workspace
    const success = await runtime.activateWorkspace(created.id);
    if (!success) {
      console.error('ACTIVATE FAILED:', runtime.getSnapshot());
    }
    expect(success).toBe(true);

    // 4. Verify snapshot state reached READY
    snapshot = runtime.getSnapshot();
    expect(snapshot.status).toBe('READY');
    expect(snapshot.activeWorkspace?.name).toBe('Data Engineering Workspace');
    expect(snapshot.verificationReport?.passed).toBe(true);
    expect(snapshot.activeSession?.id).toBeDefined();

    // 5. Verify session logged in SQLite
    const sessions = sessionStore.getRecentSessions(10);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions[0].workspaceId).toBe(created.id);
    expect(sessions[0].status).toBe('READY');

    // 6. Stop runtime
    await runtime.stop();
    snapshot = runtime.getSnapshot();
    expect(snapshot.status).toBe('IDLE');
    expect(snapshot.activeWorkspace).toBeNull();

    // 7. Verify session finalized in SQLite
    const finalSessions = sessionStore.getRecentSessions(10);
    expect(finalSessions[0].status).toBe('IDLE');
    expect(finalSessions[0].endedAt).toBeDefined();
  });
});
