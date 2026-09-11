import { EventEmitter } from 'node:events';
import { TranscriptionProvider } from './transcription-provider';
import { WhisperLocalProvider } from './whisper-provider';
import { AudioChunk, TranscriptSegment } from '../../shared/types';

export class TranscriptionManager extends EventEmitter {
  private provider: TranscriptionProvider;
  private isProcessing = false;
  private activeSessionId: string | null = null;
  private audioBuffer: Buffer[] = [];
  private totalBufferedBytes = 0;

  constructor(provider?: TranscriptionProvider) {
    super();
    this.provider = provider || new WhisperLocalProvider();
  }

  public setSession(sessionId: string | null): void {
    this.activeSessionId = sessionId;
    this.audioBuffer = [];
    this.totalBufferedBytes = 0;
  }

  public async ingestAudioChunk(chunk: AudioChunk): Promise<void> {
    if (!this.activeSessionId) return;

    this.audioBuffer.push(chunk.data);
    this.totalBufferedBytes += chunk.data.length;

    // Trigger transcription processing every ~1.5s of captured audio
    // (16000 samples/sec * 2 bytes/sample * 1.5s = 48,000 bytes)
    if (this.totalBufferedBytes >= 48000 && !this.isProcessing) {
      this.isProcessing = true;
      const combined = Buffer.concat(this.audioBuffer);
      this.audioBuffer = [];
      this.totalBufferedBytes = 0;

      try {
        this.emit('transcribing', true);
        const segment = await this.provider.processAudio(combined, this.activeSessionId);
        if (segment && segment.text.trim()) {
          this.emit('transcript', segment);
        }
      } catch (err: any) {
        this.emit('error', err.message);
      } finally {
        this.isProcessing = false;
        this.emit('transcribing', false);
      }
    }
  }

  public emitDirectTranscript(text: string, isFinal = true): TranscriptSegment | null {
    if (!this.activeSessionId) return null;

    const segment: TranscriptSegment = {
      id: Math.random().toString(36).substring(2, 9),
      sessionId: this.activeSessionId,
      text,
      isFinal,
      timestamp: Date.now(),
    };

    this.emit('transcript', segment);
    return segment;
  }

  public clear(): void {
    this.audioBuffer = [];
    this.totalBufferedBytes = 0;
    this.isProcessing = false;
  }
}
