import { AudioChunk, AudioSourceStatus, AudioSourceType } from './audio-types';

export interface AudioSource {
  readonly type: AudioSourceType;
  start(): Promise<boolean>;
  stop(): Promise<void>;
  mute(muted: boolean): void;
  getStatus(): AudioSourceStatus;
  onChunk(callback: (chunk: AudioChunk) => void): void;
}
