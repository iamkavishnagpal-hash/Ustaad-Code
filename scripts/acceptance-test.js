const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const { SQLiteBridge } = require(path.resolve(__dirname, '../dist/main/storage/database'));
const { WorkspaceStore } = require(path.resolve(__dirname, '../dist/main/storage/workspace-store'));
const { SessionStore } = require(path.resolve(__dirname, '../dist/main/storage/session-store'));
const { WorkspaceService } = require(path.resolve(__dirname, '../dist/main/workspaces/workspace-service'));
const { WorkspaceLauncher } = require(path.resolve(__dirname, '../dist/main/workspaces/workspace-launcher'));
const { WorkspaceVerifier } = require(path.resolve(__dirname, '../dist/main/workspaces/workspace-verifier'));
const { WindowManager } = require(path.resolve(__dirname, '../dist/main/windows/window-manager'));
const { PrivacyManager } = require(path.resolve(__dirname, '../dist/main/privacy/privacy-manager'));
const { HotkeyManager } = require(path.resolve(__dirname, '../dist/main/hotkeys/hotkey-manager'));
const { RuntimeEventsBus } = require(path.resolve(__dirname, '../dist/main/runtime/runtime-events'));
const { WorkspaceRuntime } = require(path.resolve(__dirname, '../dist/main/runtime/workspace-runtime'));

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
  const stateHistory = [];
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

  const passed =
    activated &&
    runtime.getSnapshot().status === 'IDLE' &&
    stateHistory.includes('ACTIVATING') &&
    stateHistory.includes('OPENING_SOURCE') &&
    stateHistory.includes('VERIFYING') &&
    stateHistory.includes('READY');

  if (passed) {
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
