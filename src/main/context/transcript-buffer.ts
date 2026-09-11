import { TranscriptSegment } from '../../shared/types';

export interface BoundedBufferConfig {
  maxSegments?: number;
  maxChars?: number;
  retentionMs?: number;
}

export class TranscriptBuffer {
  private segments: TranscriptSegment[] = [];
  private readonly maxSegments: number;
  private readonly maxChars: number;
  private readonly retentionMs: number;

  constructor(config: BoundedBufferConfig = {}) {
    this.maxSegments = config.maxSegments ?? 50;
    this.maxChars = config.maxChars ?? 10000;
    this.retentionMs = config.retentionMs ?? 10 * 60 * 1000; // 10 minutes sliding window
  }

  public append(segment: TranscriptSegment): void {
    this.segments.push(segment);
    this.prune();
  }

  public getSegments(): TranscriptSegment[] {
    this.prune();
    return [...this.segments];
  }

  public getFullText(): string {
    this.prune();
    return this.segments.map((s) => s.text).join(' ');
  }

  public getRecentPreview(maxLen = 120): string {
    this.prune();
    if (this.segments.length === 0) return '';
    const last = this.segments[this.segments.length - 1].text;
    return last.length > maxLen ? `${last.substring(0, maxLen)}...` : last;
  }

  public clear(): void {
    this.segments = [];
  }

  public count(): number {
    this.prune();
    return this.segments.length;
  }

  private prune(): void {
    const now = Date.now();

    // 1. Time-based eviction
    this.segments = this.segments.filter((s) => now - s.timestamp <= this.retentionMs);

    // 2. Count-based eviction
    if (this.segments.length > this.maxSegments) {
      this.segments = this.segments.slice(this.segments.length - this.maxSegments);
    }

    // 3. Memory / Char-based eviction
    let totalChars = this.segments.reduce((acc, s) => acc + s.text.length, 0);
    while (totalChars > this.maxChars && this.segments.length > 1) {
      const removed = this.segments.shift();
      if (removed) totalChars -= removed.text.length;
    }
  }
}
