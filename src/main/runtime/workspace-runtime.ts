import { WorkspaceService } from '../workspaces/workspace-service';
import { WorkspaceLauncher } from '../workspaces/workspace-launcher';
import { WorkspaceVerifier } from '../workspaces/workspace-verifier';
import { WindowManager } from '../windows/window-manager';
import { PrivacyManager } from '../privacy/privacy-manager';
import { HotkeyManager } from '../hotkeys/hotkey-manager';
import { SessionStore } from '../storage/session-store';
import { RuntimeStateMachine } from './runtime-state';
import { RuntimeEventsBus } from './runtime-events';
import { AudioManager } from '../audio/audio-manager';
import { TranscriptionManager } from '../transcription/transcription-manager';
import { ContextManager } from '../context/context-manager';
import { RuntimeSessionRecord, RuntimeStateSnapshot, RuntimeStatus, VerificationReport, Workspace } from '../../shared/types';

export class WorkspaceRuntime {
  private stateMachine = new RuntimeStateMachine('IDLE');
  private activeWorkspace: Workspace | null = null;
  private currentSession: RuntimeSessionRecord | null = null;
  private latestVerification: VerificationReport | null = null;
  private statusMessage: string = 'Runtime ready';

  constructor(
    private workspaceService: WorkspaceService,
    private launcher: WorkspaceLauncher,
    private verifier: WorkspaceVerifier,
    private windowManager: WindowManager,
    private privacyManager: PrivacyManager,
    private hotkeyManager: HotkeyManager,
    private sessionStore: SessionStore,
    private eventsBus: RuntimeEventsBus,
    private audioManager: AudioManager,
    private transcriptionManager: TranscriptionManager,
    private contextManager: ContextManager
  ) {
    this.setupAudioListeners();
  }

  private setupAudioListeners(): void {
    // Pipe live audio chunks directly into the transcription engine
    this.audioManager.on('audio:chunk', (chunk) => {
      this.transcriptionManager.ingestAudioChunk(chunk);
    });

    this.audioManager.on('state:changed', (audioState) => {
      this.eventsBus.notifyAudioState(audioState);
      this.broadcastCurrentSnapshot();
    });

    // Ingest transcribed segments into context buffer and publish
    this.transcriptionManager.on('transcript', (segment) => {
      this.contextManager.addTranscriptSegment(segment);
      this.eventsBus.notifyTranscript(segment);

      if (['CAPTURING', 'TRANSCRIBING'].includes(this.stateMachine.current)) {
        this.transitionTo('CONTEXT_READY', `Captured context: "${segment.text.substring(0, 40)}..."`);
      }
    });

    this.transcriptionManager.on('transcribing', (isTranscribing: boolean) => {
      if (isTranscribing && this.stateMachine.current === 'CAPTURING') {
        this.transitionTo('TRANSCRIBING', 'Transcribing captured speech');
      } else if (!isTranscribing && this.stateMachine.current === 'TRANSCRIBING') {
        this.transitionTo('CAPTURING', 'Listening for speech...');
      }
    });
  }

  public initializeHotkeys(): void {
    const workspaces = this.workspaceService.listWorkspaces();
    for (const ws of workspaces) {
      this.bindWorkspaceHotkey(ws);
    }
  }

  public bindWorkspaceHotkey(workspace: Workspace): boolean {
    const res = this.hotkeyManager.register(workspace.hotkey, async () => {
      this.eventsBus.notifyHotkeyTriggered(workspace.hotkey, workspace.id);
      await this.activateWorkspace(workspace.id);
    });

    if (!res.success) {
      console.warn(`[WorkspaceRuntime] Hotkey warning: ${res.error}`);
    }
    return res.success;
  }

  public unbindWorkspaceHotkey(hotkey: string): void {
    this.hotkeyManager.unregister(hotkey);
  }

  public async activateWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = this.workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      this.transitionTo('ERROR', `Workspace with ID "${workspaceId}" not found`);
      return false;
    }

    try {
      // 1. Resolve & Start Activation
      this.activeWorkspace = workspace;
      this.transitionTo('ACTIVATING', `Activating workspace: ${workspace.name}`);

      // 2. Create Runtime Session in DB
      this.currentSession = this.sessionStore.createSession(workspace.id, 'ACTIVATING');

      // 3. Open Source
      this.transitionTo('OPENING_SOURCE', `Opening configured source: ${workspace.source.url || workspace.source.endpoint}`);
      const launchResult = await this.launcher.launchSource(workspace);

      // 4. Configure Overlay Window & Privacy
      const overlayWin = this.windowManager.overlayManager.createOrGetOverlay(workspace.overlay);
      this.eventsBus.registerWindow(overlayWin);
      
      const privacyResult = this.privacyManager.applyWindowProtection(overlayWin, workspace.privacy);

      // 5. Verification Phase
      this.transitionTo('VERIFYING', 'Running runtime verification checks');
      const overlayMounted = overlayWin && !overlayWin.isDestroyed();

      const verification = this.verifier.verify(workspace, launchResult, overlayMounted, privacyResult);
      this.latestVerification = verification;
      this.eventsBus.notifyVerification(verification);

      if (!verification.passed) {
        const errorMsg = verification.errors.join('; ');
        this.sessionStore.updateStatus(this.currentSession.id, 'ERROR', verification, errorMsg);
        this.transitionTo('ERROR', errorMsg);
        return false;
      }

      // 6. Show HUD Overlay & enter READY state
      this.windowManager.overlayManager.show();
      this.sessionStore.updateStatus(this.currentSession.id, 'READY', verification);

      // Initialize session context
      this.transcriptionManager.setSession(this.currentSession.id);
      this.contextManager.setSession(this.currentSession.id, workspace.id);

      this.transitionTo('READY', `Workspace "${workspace.name}" active and ready`);

      return true;
    } catch (err: any) {
      const errorMsg = err?.message || 'Unexpected failure during workspace activation';
      if (this.currentSession) {
        this.sessionStore.updateStatus(this.currentSession.id, 'ERROR', undefined, errorMsg);
      }
      this.transitionTo('ERROR', errorMsg);
      return false;
    }
  }

  public async startListening(): Promise<boolean> {
    if (!['READY', 'CONTEXT_READY'].includes(this.stateMachine.current)) {
      throw new Error(`Cannot start listening while in state ${this.stateMachine.current}. Activate a workspace first.`);
    }

    try {
      this.transitionTo('CAPTURING', 'Microphone active — listening for speech');
      await this.audioManager.startListening();
      return true;
    } catch (err: any) {
      this.transitionTo('READY', `Audio capture failed: ${err.message}`);
      throw err;
    }
  }

  public async stopListening(): Promise<void> {
    if (this.audioManager.isListening()) {
      await this.audioManager.stopListening();
    }

    if (['CAPTURING', 'TRANSCRIBING', 'CONTEXT_READY'].includes(this.stateMachine.current)) {
      this.transitionTo('READY', 'Listening stopped — workspace ready');
    }
  }

  public toggleMute(): boolean {
    return this.audioManager.toggleMute();
  }

  public async stop(): Promise<void> {
    if (this.stateMachine.current === 'IDLE') return;

    this.transitionTo('STOPPING', 'Deactivating workspace runtime');

    // Ensure audio and transcription are safely ceased
    await this.audioManager.stopListening();
    this.transcriptionManager.clear();
    this.contextManager.clear();

    if (this.currentSession) {
      this.sessionStore.updateStatus(this.currentSession.id, 'IDLE');
    }

    this.windowManager.overlayManager.hide();
    this.activeWorkspace = null;
    this.currentSession = null;
    this.latestVerification = null;
    this.transitionTo('IDLE', 'Runtime is idle');
  }

  public getSnapshot(): RuntimeStateSnapshot {
    const currentContext = this.contextManager.getCurrentContext();

    return {
      status: this.stateMachine.current,
      activeWorkspace: this.activeWorkspace,
      activeSession: this.currentSession,
      verificationReport: this.latestVerification,
      audioState: this.audioManager.getState(),
      recentTranscript: this.contextManager.getRecentPreview(),
      activeApplication: currentContext.activeApplication,
      statusMessage: this.statusMessage,
      timestamp: Date.now(),
    };
  }

  public broadcastCurrentSnapshot(): void {
    const snapshot = this.getSnapshot();
    this.eventsBus.broadcastState(snapshot);
  }

  private transitionTo(target: RuntimeStatus, message: string): void {
    this.stateMachine.transition(target);
    this.statusMessage = message;
    this.broadcastCurrentSnapshot();
  }
}
