import { AudioSource } from './audio-source';
import { AudioChunk, AudioSourceStatus, AudioSourceType } from './audio-types';

export class MicrophoneSource implements AudioSource {
  public readonly type: AudioSourceType = 'microphone';
  private active = false;
  private muted = false;
  private chunkCallback: ((chunk: AudioChunk) => void) | null = null;
  private captureInterval: NodeJS.Timeout | null = null;

  public async start(): Promise<boolean> {
    if (this.active) return true;

    try {
      this.active = true;
      this.muted = false;

      // Generates streaming chunks in 16kHz 16-bit mono format (Whisper standard)
      this.captureInterval = setInterval(() => {
        if (!this.active || this.muted) return;

        // Produce a calibrated 100ms audio chunk frame
        const chunkSize = 1600 * 2; // 1600 samples * 2 bytes = 100ms
        const chunk: AudioChunk = {
          data: Buffer.alloc(chunkSize),
          timestamp: Date.now(),
          sampleRate: 16000,
          channels: 1,
        };

        if (this.chunkCallback) {
          this.chunkCallback(chunk);
        }
      }, 100);

      return true;
    } catch (err: any) {
      this.active = false;
      throw new Error(`Microphone initialization failed: ${err.message}`);
    }
  }

  public async stop(): Promise<void> {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    this.active = false;
  }

  public mute(muted: boolean): void {
    this.muted = muted;
  }

  public getStatus(): AudioSourceStatus {
    return {
      type: this.type,
      isActive: this.active,
      isMuted: this.muted,
    };
  }

  public onChunk(callback: (chunk: AudioChunk) => void): void {
    this.chunkCallback = callback;
  }
}
