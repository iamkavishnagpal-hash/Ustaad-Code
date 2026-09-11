export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sampleRate: number;
  channels: number;
}

export type AudioSourceType = 'microphone' | 'system_audio';

export interface AudioSourceStatus {
  type: AudioSourceType;
  isActive: boolean;
  isMuted: boolean;
  error?: string;
}
