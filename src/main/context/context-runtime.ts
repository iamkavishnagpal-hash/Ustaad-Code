import { EventEmitter } from 'node:events';
import { ContextBuffer } from './context-buffer';
import { ContextPayload } from './context-payload';
import { ContextEvent } from './context-events';
import { ActiveApplicationDetector } from './active-application';
import { AudioManager } from '../audio/audio-manager';
import { TranscriptionManager } from '../transcription/transcription-manager';
import { ScreenContextSource } from './screen/screen-source';
import { ScreenCaptureService } from './screen/screen-capture';
import { WindowsOcrEngine } from './screen/ocr-engine';
import { TranscriptSegment } from '../../shared/types';

export interface ContextRuntimeOptions {
  activeWindowPollIntervalMs?: number;
}

export class ContextRuntime extends EventEmitter {
  private buffer: ContextBuffer;
  private isRunning = false;
  private activeSessionId: string | null = null;
  private activeWorkspaceId: string | null = null;
  private windowPollTimer: NodeJS.Timeout | null = null;
  private screenSource: ScreenContextSource;
  private readonly pollIntervalMs: number;

  constructor(
    private audioManager: AudioManager,
    private transcriptionManager: TranscriptionManager,
    buffer?: ContextBuffer,
    screenSourceOrOptions?: ScreenContextSource | ContextRuntimeOptions,
    options: ContextRuntimeOptions = {}
  ) {
    super();
    this.buffer = buffer || new ContextBuffer();

    if (screenSourceOrOptions && 'start' in screenSourceOrOptions && typeof screenSourceOrOptions.start === 'function') {
      this.screenSource = screenSourceOrOptions;
    } else {
      this.screenSource = new ScreenContextSource(new ScreenCaptureService(), new WindowsOcrEngine());
      if (screenSourceOrOptions && !('start' in screenSourceOrOptions)) {
        options = screenSourceOrOptions;
      }
    }

    this.pollIntervalMs = options.activeWindowPollIntervalMs ?? 3000;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Pipe live transcripts into ContextBuffer
    this.transcriptionManager.on('transcript', (segment: TranscriptSegment) => {
      if (!this.isRunning) return;

      this.buffer.appendTranscript(segment);

      const recentPreview = this.buffer.getRecentPreview();
      this.dispatchContextEvent({
        type: 'TRANSCRIPT_UPDATED',
        segment,
        totalSegments: this.buffer.count(),
        recentPreview,
        timestamp: Date.now(),
      });

      this.broadcastUpdatedPayload();
    });

    // Listen to audio errors gracefully without tearing down context
    this.audioManager.on('error', (err: string) => {
      this.dispatchContextEvent({
        type: 'CONTEXT_ERROR',
        source: 'microphone',
        error: err,
        recoverable: true,
        timestamp: Date.now(),
      });
    });
  }

  public async startContext(workspaceId: string, sessionId: string): Promise<boolean> {
    if (this.isRunning && this.activeSessionId === sessionId) {
      return true;
    }

    this.activeWorkspaceId = workspaceId;
    this.activeSessionId = sessionId;
    this.buffer.reset(Date.now());
    this.isRunning = true;

    this.transcriptionManager.setSession(sessionId);

    // Initial probe of active application
    this.pollActiveWindow();

    // Start screen source
    await this.screenSource.start();

    // Start background window polling
    this.startWindowPolling();

    this.dispatchContextEvent({
      type: 'CONTEXT_SESSION_STARTED',
      sessionId,
      workspaceId,
      timestamp: Date.now(),
    });

    this.broadcastUpdatedPayload();
    return true;
  }

  public async stopContext(): Promise<void> {
    if (!this.isRunning) return;

    this.stopWindowPolling();
    await this.screenSource.stop();

    // Ensure audio ceases cleanly if active
    if (this.audioManager.isListening()) {
      await this.audioManager.stopListening();
    }

    const previousSessionId = this.activeSessionId || '';
    this.isRunning = false;
    this.activeSessionId = null;
    this.activeWorkspaceId = null;

    this.dispatchContextEvent({
      type: 'CONTEXT_SESSION_STOPPED',
      sessionId: previousSessionId,
      timestamp: Date.now(),
    });
  }

  public async startAudioCapture(): Promise<boolean> {
    if (!this.isRunning) {
      throw new Error('Context session must be started before initiating audio capture');
    }
    return await this.audioManager.startListening();
  }

  public async stopAudioCapture(): Promise<void> {
    await this.audioManager.stopListening();
  }

  public toggleMute(): boolean {
    return this.audioManager.toggleMute();
  }

  public getCurrentPayload(): ContextPayload {
    const audioState = this.audioManager.getState();
    const sources = {
      microphone: audioState.microphone && !audioState.muted,
      systemAudio: audioState.systemAudio,
      activeWindow: this.isRunning,
      screen: this.screenSource.isActive(),
    };

    return this.buffer.toPayload(
      this.activeWorkspaceId || '',
      this.activeSessionId || '',
      sources
    );
  }

  public getRecentPreview(): string {
    return this.buffer.getRecentPreview();
  }

  public getBuffer(): ContextBuffer {
    return this.buffer;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  private startWindowPolling(): void {
    this.stopWindowPolling();
    this.windowPollTimer = setInterval(() => {
      this.pollActiveWindow();
    }, this.pollIntervalMs);
  }

  private stopWindowPolling(): void {
    if (this.windowPollTimer) {
      clearInterval(this.windowPollTimer);
      this.windowPollTimer = null;
    }
  }

  private pollActiveWindow(): void {
    try {
      const activeApp = ActiveApplicationDetector.getActiveApplication();
      const changed = this.buffer.setActiveWindow({
        application: activeApp.processName,
        title: activeApp.title,
        processId: activeApp.pid,
      });

      if (changed) {
        this.dispatchContextEvent({
          type: 'ACTIVE_WINDOW_CHANGED',
          window: {
            application: activeApp.processName,
            title: activeApp.title,
            processId: activeApp.pid,
          },
          timestamp: Date.now(),
        });

        // Trigger change-based visual screen context capture
        this.screenSource.evaluateChange().then((screenSnap) => {
          if (screenSnap) {
            this.buffer.setScreenContext(screenSnap);
            this.broadcastUpdatedPayload();
          }
        });

        this.broadcastUpdatedPayload();
      }
    } catch (err: any) {
      // Non-fatal error; window probe failure should not crash context runtime
      this.dispatchContextEvent({
        type: 'CONTEXT_ERROR',
        source: 'active-window',
        error: err?.message || 'Failed to detect active window',
        recoverable: true,
        timestamp: Date.now(),
      });
    }
  }

  private broadcastUpdatedPayload(): void {
    const payload = this.getCurrentPayload();
    this.dispatchContextEvent({
      type: 'CONTEXT_UPDATED',
      payload,
      timestamp: Date.now(),
    });
    this.emit('payload:updated', payload);
  }

  private dispatchContextEvent(event: ContextEvent): void {
    this.emit('context:event', event);
    this.emit(event.type, event);
  }
}
