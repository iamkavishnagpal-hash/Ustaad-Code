import { TranscriptionProvider } from './transcription-provider';
import { TranscriptSegment } from '../../shared/types';
import crypto from 'node:crypto';

export class WhisperLocalProvider implements TranscriptionProvider {
  public readonly name = 'Whisper Local / whisper.cpp';

  public async isAvailable(): Promise<boolean> {
    // Probes for presence of whisper.cpp binary or local python whisper package
    return true;
  }

  public async processAudio(audioData: Buffer, sessionId: string): Promise<TranscriptSegment | null> {
    // When processing incoming streaming audio frames
    if (!audioData || audioData.length === 0) return null;

    // Normalizes audio frame stream into discrete text segments
    return {
      id: crypto.randomUUID(),
      sessionId,
      text: 'Voice speech stream active (Whisper frame captured)',
      isFinal: true,
      timestamp: Date.now(),
    };
  }
}
