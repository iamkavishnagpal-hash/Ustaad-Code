import { TranscriptSegment } from '../../shared/types';
import { ActiveWindowInfo } from './context-source';
import { ContextPayload } from './context-payload';

export interface BoundedBufferConfig {
  maxSegments?: number;
  maxChars?: number;
  retentionMs?: number;
}

export class ContextBuffer {
  private segments: TranscriptSegment[] = [];
  private currentActiveWindow: ActiveWindowInfo | null = null;
  private readonly maxSegments: number;
  private readonly maxChars: number;
  private readonly retentionMs: number;
  private sessionStartTime: number = Date.now();
  private lastUpdateTime: number = Date.now();

  constructor(config: BoundedBufferConfig = {}) {
    this.maxSegments = config.maxSegments ?? 50;
    this.maxChars = config.maxChars ?? 10000;
    this.retentionMs = config.retentionMs ?? 10 * 60 * 1000; // 10 minutes sliding window
  }

  public reset(sessionStartTime = Date.now()): void {
    this.segments = [];
    this.currentActiveWindow = null;
    this.sessionStartTime = sessionStartTime;
    this.lastUpdateTime = sessionStartTime;
  }

  public appendTranscript(segment: TranscriptSegment): void {
    this.segments.push(segment);
    this.lastUpdateTime = segment.timestamp || Date.now();
    this.prune();
  }

  public setActiveWindow(info: ActiveWindowInfo): boolean {
    const changed =
      !this.currentActiveWindow ||
      this.currentActiveWindow.application !== info.application ||
      this.currentActiveWindow.title !== info.title ||
      this.currentActiveWindow.processId !== info.processId;

    if (changed) {
      this.currentActiveWindow = { ...info };
      this.lastUpdateTime = Date.now();
    }
    return changed;
  }

  public getActiveWindow(): ActiveWindowInfo | null {
    return this.currentActiveWindow ? { ...this.currentActiveWindow } : null;
  }

  public getSegments(): TranscriptSegment[] {
    this.prune();
    return [...this.segments];
  }

  public getFullTranscriptText(): string {
    this.prune();
    return this.segments.map((s) => s.text).join(' ');
  }

  public getRecentPreview(maxLen = 120): string {
    this.prune();
    if (this.segments.length === 0) return '';
    const last = this.segments[this.segments.length - 1].text;
    return last.length > maxLen ? `${last.substring(0, maxLen)}...` : last;
  }

  public toPayload(
    workspaceId: string,
    sessionId: string,
    sources: { microphone: boolean; systemAudio: boolean; activeWindow: boolean; screen: boolean }
  ): ContextPayload {
    this.prune();
    return {
      workspaceId,
      sessionId,
      timestamp: Date.now(),
      transcript: {
        text: this.getFullTranscriptText(),
        startedAt: this.sessionStartTime,
        updatedAt: this.lastUpdateTime,
        segmentCount: this.segments.length,
      },
      activeWindow: this.currentActiveWindow
        ? {
            application: this.currentActiveWindow.application,
            title: this.currentActiveWindow.title,
            processId: this.currentActiveWindow.processId,
          }
        : undefined,
      sources,
    };
  }

  public count(): number {
    this.prune();
    return this.segments.length;
  }

  public clear(): void {
    this.segments = [];
    this.currentActiveWindow = null;
  }

  private prune(): void {
    const now = Date.now();

    // 1. Time-based eviction (sliding window)
    this.segments = this.segments.filter((s) => now - s.timestamp <= this.retentionMs);

    // 2. Count-based eviction
    if (this.segments.length > this.maxSegments) {
      this.segments = this.segments.slice(this.segments.length - this.maxSegments);
    }

    // 3. Character / byte-budget eviction
    let totalChars = this.segments.reduce((acc, s) => acc + s.text.length, 0);
    while (totalChars > this.maxChars && this.segments.length > 1) {
      const removed = this.segments.shift();
      if (removed) totalChars -= removed.text.length;
    }
  }
}
