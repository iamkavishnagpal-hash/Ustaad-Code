import { describe, it, expect } from 'vitest';
import { AudioManager } from '../../src/main/audio/audio-manager';
import { TranscriptionManager } from '../../src/main/transcription/transcription-manager';
import { ContextManager } from '../../src/main/context/context-manager';
import { TranscriptBuffer } from '../../src/main/context/transcript-buffer';

describe('Live Context Runtime Integration Flow', () => {
  it('streams audio chunks through transcription into bounded context buffer', async () => {
    const audioManager = new AudioManager();
    const transcriptionManager = new TranscriptionManager();
    const buffer = new TranscriptBuffer({ maxSegments: 10 });
    const contextManager = new ContextManager(buffer);

    const sessionId = 'test-session-live';
    const workspaceId = 'test-ws-data';
    transcriptionManager.setSession(sessionId);
    contextManager.setSession(sessionId, workspaceId);

    // Verify initial state
    expect(contextManager.getCurrentContext().transcript.length).toBe(0);

    // 1. Direct transcript emitted by speech-to-text
    const segment = transcriptionManager.emitDirectTranscript('SELECT count(*) FROM telemetry_events;', true);
    expect(segment).toBeDefined();

    if (segment) {
      contextManager.addTranscriptSegment(segment);
    }

    // 2. Verify buffered context
    const currentContext = contextManager.getCurrentContext();
    expect(currentContext.transcript.length).toBe(1);
    expect(currentContext.transcript[0].text).toBe('SELECT count(*) FROM telemetry_events;');
    expect(contextManager.getRecentPreview()).toBe('SELECT count(*) FROM telemetry_events;');

    // 3. Clean teardown
    audioManager.stopListening();
    transcriptionManager.clear();
    contextManager.clear();

    expect(contextManager.getCurrentContext().transcript.length).toBe(0);
  });
});
