import { describe, it, expect } from 'vitest';
import { ContextManager } from '../../src/main/context/context-manager';
import { TranscriptBuffer } from '../../src/main/context/transcript-buffer';

describe('ContextManager Aggregation', () => {
  it('aggregates transcript stream and captures active context snapshot', () => {
    const buffer = new TranscriptBuffer();
    const contextManager = new ContextManager(buffer);

    contextManager.setSession('sess-100', 'ws-200');

    contextManager.addTranscriptSegment({
      id: 'seg-1',
      sessionId: 'sess-100',
      text: 'Explaining Apache Spark streaming architecture',
      isFinal: true,
      timestamp: Date.now(),
    });

    const ctx = contextManager.getCurrentContext();
    expect(ctx.sessionId).toBe('sess-100');
    expect(ctx.workspaceId).toBe('ws-200');
    expect(ctx.transcript.length).toBe(1);
    expect(ctx.transcript[0].text).toContain('Apache Spark');
    expect(ctx.activeApplication).toBeDefined();
    expect(ctx.capturedAt).toBeGreaterThan(0);
  });
});
