import { TranscriptSegment } from '../../shared/types';

export interface TranscriptionProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  processAudio(audioData: Buffer, sessionId: string): Promise<TranscriptSegment | null>;
}
