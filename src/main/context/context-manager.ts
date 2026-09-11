import { EventEmitter } from 'node:events';
import { TranscriptBuffer } from './transcript-buffer';
import { ActiveApplicationDetector } from './active-application';
import { RuntimeContext, TranscriptSegment } from '../../shared/types';

export class ContextManager extends EventEmitter {
  private buffer: TranscriptBuffer;
  private activeSessionId: string | null = null;
  private activeWorkspaceId: string | null = null;

  constructor(buffer?: TranscriptBuffer) {
    super();
    this.buffer = buffer || new TranscriptBuffer();
  }

  public setSession(sessionId: string | null, workspaceId: string | null): void {
    this.activeSessionId = sessionId;
    this.activeWorkspaceId = workspaceId;
    this.buffer.clear();
  }

  public addTranscriptSegment(segment: TranscriptSegment): void {
    this.buffer.append(segment);
    const currentContext = this.getCurrentContext();
    this.emit('context:updated', currentContext);
  }

  public getCurrentContext(): RuntimeContext {
    const activeApp = ActiveApplicationDetector.getActiveApplication();

    return {
      sessionId: this.activeSessionId || '',
      workspaceId: this.activeWorkspaceId || '',
      transcript: this.buffer.getSegments(),
      activeApplication: activeApp,
      capturedAt: Date.now(),
    };
  }

  public getRecentPreview(): string {
    return this.buffer.getRecentPreview();
  }

  public clear(): void {
    this.buffer.clear();
  }
}
