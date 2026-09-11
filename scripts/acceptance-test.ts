import { app } from 'electron';
import { SQLiteBridge } from './src/main/storage/database';
import { WorkspaceStore } from './src/main/storage/workspace-store';
import { SessionStore } from './src/main/storage/session-store';
import { WorkspaceService } from './src/main/workspaces/workspace-service';
import { WorkspaceLauncher } from './src/main/workspaces/workspace-launcher';
import { WorkspaceVerifier } from './src/main/workspaces/workspace-verifier';
import { WindowManager } from './src/main/windows/window-manager';
import { PrivacyManager } from './src/main/privacy/privacy-manager';
import { HotkeyManager } from './src/main/hotkeys/hotkey-manager';
import { RuntimeEventsBus } from './src/main/runtime/runtime-events';
import { WorkspaceRuntime } from './src/main/runtime/workspace-runtime';
import path from 'node:path';
import fs from 'node:fs';

async function runAcceptanceTest() {
  console.log('[Acceptance Test] Starting Phase 1 Workspace Runtime Acceptance Test...');

  const testDbPath = path.join(__dirname, 'acceptance-test.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  // 1. Initialize SQLite Database
  const db = new SQLiteBridge(testDbPath);
  const workspaceStore = new WorkspaceStore(db);
  const sessionStore = new SessionStore(db);
  const workspaceService = new WorkspaceService(workspaceStore);

  // 2. Create Workspace
  console.log('[Acceptance Test] Creating workspace...');
  const created = workspaceService.createWorkspace({
    name: 'Acceptance Meeting Project',
    description: 'Phase 1 verification test workspace',
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
      captureProtection: false,
      taskbarVisibility: 'shown',
      overlayCapturePolicy: 'normal',
    },
    overlay: {
      alwaysOnTop: true,
      opacity: 0.92,
      width: 420,
      position: 'top-right',
    },
  });

  console.log(`[Acceptance Test] Workspace created in SQLite with ID: ${created.id}`);

  // 3. Setup Runtime & Managers
  const launcher = new WorkspaceLauncher();
  const verifier = new WorkspaceVerifier();
  const windowManager = new WindowManager();
  const privacyManager = new PrivacyManager();
  const hotkeyManager = new HotkeyManager();
  const eventsBus = new RuntimeEventsBus();

  const runtime = new WorkspaceRuntime(
    workspaceService,
    launcher,
    verifier,
    windowManager,
    privacyManager,
    hotkeyManager,
    sessionStore,
    eventsBus
  );

  // Track state transitions
  const stateHistory: string[] = [];
  eventsBus.on('state:changed', (snapshot) => {
    stateHistory.push(snapshot.status);
    console.log(`[Runtime State Transition] -> ${snapshot.status} (${snapshot.statusMessage})`);
  });

  // 4. Test Workspace Activation
  console.log('[Acceptance Test] Triggering activation for workspace...');
  const activated = await runtime.activateWorkspace(created.id);

  console.log(`[Acceptance Test] Activation result: ${activated}`);
  console.log(`[Acceptance Test] Current Runtime State: ${runtime.getSnapshot().status}`);

  const latestSession = sessionStore.getRecentSessions(1)[0];
  console.log(`[Acceptance Test] Session status in SQLite: ${latestSession?.status}`);
  console.log(`[Acceptance Test] Verification report passed: ${latestSession?.verificationReport?.passed}`);

  // 5. Test Stop / Deactivation
  console.log('[Acceptance Test] Stopping runtime session...');
  await runtime.stop();
  console.log(`[Acceptance Test] Runtime State after stop: ${runtime.getSnapshot().status}`);

  // 6. Cleanup & Exit
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  if (
    activated &&
    runtime.getSnapshot().status === 'IDLE' &&
    stateHistory.includes('ACTIVATING') &&
    stateHistory.includes('OPENING_SOURCE') &&
    stateHistory.includes('VERIFYING') &&
    stateHistory.includes('READY')
  ) {
    console.log('\n========================================');
    console.log('✅ ALL PHASE 1 ACCEPTANCE CRITERIA PASSED!');
    console.log('========================================\n');
    app.quit();
    process.exit(0);
  } else {
    console.error('❌ Acceptance test failed state sequence checks: ', stateHistory);
    app.quit();
    process.exit(1);
  }
}

app.whenReady().then(runAcceptanceTest);
