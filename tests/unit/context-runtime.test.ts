import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextRuntime } from '../../src/main/context/context-runtime';
import { ContextBuffer } from '../../src/main/context/context-buffer';
import { AudioManager } from '../../src/main/audio/audio-manager';
import { TranscriptionManager } from '../../src/main/transcription/transcription-manager';
import { TranscriptSegment } from '../../shared/types';

describe('ContextRuntime Lifecycle & Merging', () => {
  let audioManager: AudioManager;
  let transcriptionManager: TranscriptionManager;
  let buffer: ContextBuffer;
  let runtime: ContextRuntime;

  beforeEach(() => {
    audioManager = new AudioManager();
    transcriptionManager = new TranscriptionManager();
    buffer = new ContextBuffer({ maxSegments: 10, maxChars: 500 });
    runtime = new ContextRuntime(audioManager, transcriptionManager, buffer, {
      activeWindowPollIntervalMs: 50,
    });
  });

  afterEach(async () => {
    await runtime.stopContext();
    vi.restoreAllMocks();
  });

  it('starts and stops context session cleanly without throwing', async () => {
    expect(runtime.isActive()).toBe(false);

    const started = await runtime.startContext('ws-test-1', 'session-test-1');
    expect(started).toBe(true);
    expect(runtime.isActive()).toBe(true);

    const payload = runtime.getCurrentPayload();
    expect(payload.workspaceId).toBe('ws-test-1');
    expect(payload.sessionId).toBe('session-test-1');
    expect(payload.sources.activeWindow).toBe(true);
    expect(payload.sources.microphone).toBe(false); // microphone not started yet

    await runtime.stopContext();
    expect(runtime.isActive()).toBe(false);
  });

  it('merges incoming transcript segments into ContextPayload', async () => {
    await runtime.startContext('ws-test-1', 'session-test-1');

    const segment: TranscriptSegment = {
      id: 'seg-1',
      sessionId: 'session-test-1',
      text: 'Querying BigQuery partitioned table for user telemetry.',
      isFinal: true,
      timestamp: Date.now(),
    };

    // Emit transcript through transcriptionManager
    transcriptionManager.emit('transcript', segment);

    const payload = runtime.getCurrentPayload();
    expect(payload.transcript.text).toContain('Querying BigQuery partitioned table');
    expect(payload.transcript.segmentCount).toBe(1);
    expect(runtime.getRecentPreview()).toContain('Querying BigQuery');
  });

  it('merges active window changes into ContextPayload', async () => {
    await runtime.startContext('ws-test-1', 'session-test-1');

    buffer.setActiveWindow({
      application: 'Code',
      title: 'VS Code - UstaadG Pipeline',
      processId: 10420,
    });

    const payload = runtime.getCurrentPayload();
    expect(payload.activeWindow?.application).toBe('Code');
    expect(payload.activeWindow?.title).toContain('VS Code');
  });

  it('enforces bounded limits on the rolling transcript buffer', () => {
    const tinyBuffer = new ContextBuffer({ maxSegments: 3, maxChars: 100 });

    for (let i = 1; i <= 5; i++) {
      tinyBuffer.appendTranscript({
        id: `seg-${i}`,
        sessionId: 'sess',
        text: `Segment number ${i}`,
        isFinal: true,
        timestamp: Date.now(),
      });
    }

    expect(tinyBuffer.count()).toBeLessThanOrEqual(3);
    const text = tinyBuffer.getFullTranscriptText();
    expect(text).not.toContain('Segment number 1');
    expect(text).toContain('Segment number 5');
  });
});
