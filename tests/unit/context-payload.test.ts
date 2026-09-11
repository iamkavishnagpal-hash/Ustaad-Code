import { describe, it, expect } from 'vitest';
import { ContextPayloadSchema, ContextPayload } from '../../src/main/context/context-payload';

describe('ContextPayload Schema & Model Validation', () => {
  it('validates a valid normalized ContextPayload', () => {
    const raw: ContextPayload = {
      workspaceId: 'ws-123',
      sessionId: 'sess-456',
      timestamp: 1789152000000,
      transcript: {
        text: 'The Spark batch job pipeline finished successfully.',
        startedAt: 1789151000000,
        updatedAt: 1789152000000,
        segmentCount: 4,
      },
      activeWindow: {
        application: 'Code',
        title: 'VS Code - UstaadG Pipeline',
        processId: 10420,
      },
      sources: {
        microphone: true,
        systemAudio: false,
        activeWindow: true,
        screen: false,
      },
    };

    const parsed = ContextPayloadSchema.parse(raw);
    expect(parsed.workspaceId).toBe('ws-123');
    expect(parsed.transcript.segmentCount).toBe(4);
    expect(parsed.activeWindow?.application).toBe('Code');
    expect(parsed.sources.microphone).toBe(true);
  });

  it('rejects payload missing required fields', () => {
    const invalid = {
      workspaceId: 'ws-123',
      // missing sessionId, timestamp, transcript, sources
    };

    expect(() => ContextPayloadSchema.parse(invalid)).toThrow();
  });
});
