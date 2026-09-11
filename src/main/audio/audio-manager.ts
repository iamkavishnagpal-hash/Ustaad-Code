import { EventEmitter } from 'node:events';
import { AudioChunk, AudioInputState } from '../../shared/types';
import { MicrophoneSource } from './microphone-source';
import { SystemAudioSource } from './system-audio-source';

export class AudioManager extends EventEmitter {
  private micSource: MicrophoneSource;
  private sysSource: SystemAudioSource;
  private listening = false;
  private muted = false;

  constructor(micSource?: MicrophoneSource, sysSource?: SystemAudioSource) {
    super();
    this.micSource = micSource || new MicrophoneSource();
    this.sysSource = sysSource || new SystemAudioSource();

    this.micSource.onChunk((chunk) => {
      if (this.listening && !this.muted) {
        this.emit('audio:chunk', chunk);
      }
    });
  }

  public async startListening(): Promise<boolean> {
    if (this.listening) return true;

    try {
      const micStarted = await this.micSource.start();
      if (!micStarted) {
        throw new Error('Microphone device could not be started');
      }

      this.listening = true;
      this.muted = false;
      this.emit('state:changed', this.getState());
      return true;
    } catch (err: any) {
      this.listening = false;
      this.emit('error', err.message);
      throw err;
    }
  }

  public async stopListening(): Promise<void> {
    if (!this.listening) return;

    await this.micSource.stop();
    await this.sysSource.stop();
    this.listening = false;
    this.emit('state:changed', this.getState());
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.micSource.mute(this.muted);
    this.emit('state:changed', this.getState());
    return this.muted;
  }

  public isListening(): boolean {
    return this.listening;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getState(): AudioInputState {
    const sysStatus = this.sysSource.getStatus();
    return {
      microphone: this.listening && !this.muted,
      systemAudio: false,
      muted: this.muted,
      deviceName: 'Default Microphone (16kHz 16-bit Mono)',
      systemAudioSupported: false,
      systemAudioNotice: sysStatus.error || 'System audio unavailable on this configuration.',
    };
  }
}
