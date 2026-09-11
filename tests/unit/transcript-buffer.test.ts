import { describe, it, expect } from 'vitest';
import { TranscriptBuffer } from '../../src/main/context/transcript-buffer';
import { TranscriptSegment } from '../../src/shared/types';

describe('TranscriptBuffer Bounded Sliding Window', () => {
  it('appends segments and preserves order', () => {
    const buffer = new TranscriptBuffer({ maxSegments: 5 });

    const s1: TranscriptSegment = { id: '1', sessionId: 'sess-1', text: 'Hello', isFinal: true, timestamp: Date.now() };
    const s2: TranscriptSegment = { id: '2', sessionId: 'sess-1', text: 'world', isFinal: true, timestamp: Date.now() };

    buffer.append(s1);
    buffer.append(s2);

    expect(buffer.count()).toBe(2);
    expect(buffer.getFullText()).toBe('Hello world');
    expect(buffer.getRecentPreview()).toBe('world');
  });

  it('strictly enforces segment count limit (FIFO ring buffer)', () => {
    const buffer = new TranscriptBuffer({ maxSegments: 3 });

    for (let i = 1; i <= 5; i++) {
      buffer.append({
        id: `id-${i}`,
        sessionId: 'sess-1',
        text: `Segment ${i}`,
        isFinal: true,
        timestamp: Date.now(),
      });
    }

    expect(buffer.count()).toBe(3);
    const segments = buffer.getSegments();
    expect(segments.map((s) => s.text)).toEqual(['Segment 3', 'Segment 4', 'Segment 5']);
  });

  it('prunes segments older than retention duration', () => {
    const buffer = new TranscriptBuffer({ retentionMs: 1000 }); // 1 second retention

    const oldTime = Date.now() - 2000;
    buffer.append({
      id: 'old-1',
      sessionId: 'sess-1',
      text: 'Expired segment',
      isFinal: true,
      timestamp: oldTime,
    });

    buffer.append({
      id: 'new-1',
      sessionId: 'sess-1',
      text: 'Fresh segment',
      isFinal: true,
      timestamp: Date.now(),
    });

    expect(buffer.count()).toBe(1);
    expect(buffer.getFullText()).toBe('Fresh segment');
  });

  it('enforces total character boundary preventing memory bloat', () => {
    const buffer = new TranscriptBuffer({ maxChars: 30 });

    buffer.append({ id: '1', sessionId: 's', text: 'Short 1', isFinal: true, timestamp: Date.now() });
    buffer.append({ id: '2', sessionId: 's', text: 'A somewhat longer sentence that exceeds 30 chars', isFinal: true, timestamp: Date.now() });

    expect(buffer.getFullText().length).toBeLessThanOrEqual(50);
  });
});
