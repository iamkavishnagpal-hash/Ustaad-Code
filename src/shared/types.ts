import { z } from 'zod';
import { WorkspaceSchema, SourceSchema, WorkspaceInputSchema } from './schemas';

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type WorkspaceInput = z.infer<typeof WorkspaceInputSchema>;
export type WorkspaceSource = z.infer<typeof SourceSchema>;

export type RuntimeStatus =
  | 'IDLE'
  | 'ACTIVATING'
  | 'OPENING_SOURCE'
  | 'VERIFYING'
  | 'READY'
  | 'CAPTURING'
  | 'TRANSCRIBING'
  | 'CONTEXT_READY'
  | 'RUNNING'
  | 'STOPPING'
  | 'ERROR';

export interface VerificationReport {
  passed: boolean;
  workspaceResolved: boolean;
  sourceReachable: boolean;
  sourceLaunched: boolean;
  overlayMounted: boolean;
  privacyPolicyApplied: boolean;
  privacyNotice: string;
  errors: string[];
}

export interface AudioInputState {
  microphone: boolean;
  systemAudio: boolean;
  muted: boolean;
  deviceName?: string;
  systemAudioSupported: boolean;
  systemAudioNotice: string;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sampleRate: number;
  channels: number;
}

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface ActiveApplicationContext {
  title: string;
  processName?: string;
  pid?: number;
}

export interface RuntimeContext {
  sessionId: string;
  workspaceId: string;
  transcript: TranscriptSegment[];
  activeApplication?: ActiveApplicationContext;
  capturedAt: number;
}

export interface RuntimeSessionRecord {
  id: string;
  workspaceId: string;
  status: RuntimeStatus;
  startedAt: number;
  endedAt?: number;
  verificationReport?: VerificationReport;
  errorMessage?: string;
}

export interface RuntimeStateSnapshot {
  status: RuntimeStatus;
  activeWorkspace: Workspace | null;
  activeSession: RuntimeSessionRecord | null;
  verificationReport: VerificationReport | null;
  audioState: AudioInputState;
  recentTranscript: string;
  activeApplication?: ActiveApplicationContext;
  statusMessage: string;
  timestamp: number;
}
