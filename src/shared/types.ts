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
  statusMessage: string;
  timestamp: number;
}
