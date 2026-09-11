import { AudioSource } from './audio-source';
import { AudioChunk, AudioSourceStatus, AudioSourceType } from './audio-types';

export class SystemAudioSource implements AudioSource {
  public readonly type: AudioSourceType = 'system_audio';
  private active = false;
  private muted = false;

  public async start(): Promise<boolean> {
    // Windows WASAPI loopback probe:
    // Without an elevated virtual audio loopback driver or dedicated Windows loopback session,
    // we never fabricate fake system audio capture.
    this.active = false;
    return false;
  }

  public async stop(): Promise<void> {
    this.active = false;
  }

  public mute(muted: boolean): void {
    this.muted = muted;
  }

  public getStatus(): AudioSourceStatus {
    return {
      type: this.type,
      isActive: false,
      isMuted: this.muted,
      error: 'System audio loopback unavailable on current Windows configuration without elevated WASAPI driver.',
    };
  }

  public onChunk(_callback: (chunk: AudioChunk) => void): void {
    // No-op for unavailable hardware loopback
  }
}
