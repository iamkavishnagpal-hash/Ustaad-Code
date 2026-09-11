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
const { AudioManager } = require(path.resolve(__dirname, '../dist/main/audio/audio-manager'));
const { TranscriptionManager } = require(path.resolve(__dirname, '../dist/main/transcription/transcription-manager'));
const { ContextManager } = require(path.resolve(__dirname, '../dist/main/context/context-manager'));

async function runPhase2AcceptanceTest() {
  console.log('[Acceptance Test] Starting Phase 2 Live Context Runtime Acceptance Test...');

  const testDbPath = path.join(__dirname, 'acceptance-test-phase2.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  // 1. Initialize SQLite Database & Stores
  const db = new SQLiteBridge(testDbPath);
  const workspaceStore = new WorkspaceStore(db);
  const sessionStore = new SessionStore(db);
  const workspaceService = new WorkspaceService(workspaceStore);

  // 2. Create Workspace
  const created = workspaceService.createWorkspace({
    name: 'Phase 2 Live Context Project',
    description: 'Continuous audio and contextual stream test workspace',
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
    hotkey: 'Ctrl+Shift+K',
    privacy: {
      captureProtection: false,
      taskbarVisibility: 'shown',
      overlayCapturePolicy: 'normal',
    },
    overlay: {
      alwaysOnTop: true,
      opacity: 0.95,
      width: 420,
      position: 'top-right',
    },
  });

  console.log(`[Acceptance Test] Workspace created with ID: ${created.id}`);

  // 3. Setup Runtime & Phase 2 Services
  const launcher = new WorkspaceLauncher();
  const verifier = new WorkspaceVerifier();
  const windowManager = new WindowManager();
  const privacyManager = new PrivacyManager();
  const hotkeyManager = new HotkeyManager();
  const eventsBus = new RuntimeEventsBus();
  const audioManager = new AudioManager();
  const transcriptionManager = new TranscriptionManager();
  const contextManager = new ContextManager();

  const runtime = new WorkspaceRuntime(
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

  const stateHistory = [];
  eventsBus.on('state:changed', (snapshot) => {
    stateHistory.push(snapshot.status);
    console.log(`[Runtime State Transition] -> ${snapshot.status} (${snapshot.statusMessage})`);
  });

  // 4. Activate Workspace (Reaches READY)
  console.log('[Acceptance Test] Activating workspace...');
  const activated = await runtime.activateWorkspace(created.id);
  console.log(`[Acceptance Test] Activation result: ${activated}, Status: ${runtime.getSnapshot().status}`);

  // 5. Start Audio Listening (Reaches CAPTURING)
  console.log('[Acceptance Test] Starting audio listening...');
  const startedListening = await runtime.startListening();
  console.log(`[Acceptance Test] Listening started: ${startedListening}, Status: ${runtime.getSnapshot().status}`);

  // 6. Direct Transcript Injection & Stream
  console.log('[Acceptance Test] Simulating speech-to-text transcription event...');
  // Note: transcriptionManager emits 'transcription:segment', which runtime forwards to contextManager
  const segment = transcriptionManager.emitDirectTranscript('SELECT pipeline_status, error_rate FROM ingestion_metrics;', true);

  // 7. Verify Context Buffer & Active App
  const ctx = contextManager.getCurrentContext();
  console.log(`[Acceptance Test] Buffered transcript count: ${ctx.transcript.length}`);
  console.log(`[Acceptance Test] Active App Title: ${ctx.activeApplication.title}`);
  console.log(`[Acceptance Test] Active App Process: ${ctx.activeApplication.processName}`);
  console.log(`[Acceptance Test] Rolling Preview: "${contextManager.getRecentPreview()}"`);

  // 8. Stop Audio & Teardown
  console.log('[Acceptance Test] Stopping listening...');
  runtime.stopListening();
  console.log(`[Acceptance Test] Status after stop listening: ${runtime.getSnapshot().status}`);

  console.log('[Acceptance Test] Stopping runtime...');
  await runtime.stop();
  console.log(`[Acceptance Test] Final Status: ${runtime.getSnapshot().status}`);

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const passed =
    activated &&
    stateHistory.includes('ACTIVATING') &&
    stateHistory.includes('READY') &&
    stateHistory.includes('CAPTURING') &&
    ctx.transcript.length === 1 &&
    ctx.transcript[0].text.includes('SELECT pipeline_status') &&
    runtime.getSnapshot().status === 'IDLE';

  if (passed) {
    console.log('\n======================================================');
    console.log('✅ ALL PHASE 2 LIVE CONTEXT ACCEPTANCE CRITERIA PASSED!');
    console.log('======================================================\n');
    app.quit();
    process.exit(0);
  } else {
    console.error('❌ Acceptance test failed state sequence checks: ', stateHistory);
    app.quit();
    process.exit(1);
  }
}

app.whenReady().then(runPhase2AcceptanceTest);
