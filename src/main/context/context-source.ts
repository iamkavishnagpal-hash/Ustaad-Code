import { TranscriptSegment } from '../../shared/types';

export interface ContextSource<T> {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  start(): Promise<boolean>;
  stop(): Promise<void>;
  isActive(): boolean;
  onData(callback: (data: T) => void): void;
  onError?(callback: (err: Error) => void): void;
}

/**
 * Provider-neutral SpeechRecognizer contract per Phase 2 Section 6
 */
export interface SpeechRecognizer {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  onTranscript(callback: (segment: TranscriptSegment) => void): void;
  onError?(callback: (err: Error) => void): void;
}

export interface ActiveWindowInfo {
  application?: string;
  title?: string;
  processId?: number;
}
