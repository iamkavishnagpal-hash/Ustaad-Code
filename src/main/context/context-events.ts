import { ContextPayload } from './context-payload';
import { TranscriptSegment } from '../../shared/types';

export type ContextEventType =
  | 'CONTEXT_SESSION_STARTED'
  | 'TRANSCRIPT_UPDATED'
  | 'ACTIVE_WINDOW_CHANGED'
  | 'CONTEXT_UPDATED'
  | 'CONTEXT_SESSION_STOPPED'
  | 'CONTEXT_ERROR';

export interface ContextSessionStartedEvent {
  type: 'CONTEXT_SESSION_STARTED';
  sessionId: string;
  workspaceId: string;
  timestamp: number;
}

export interface TranscriptUpdatedEvent {
  type: 'TRANSCRIPT_UPDATED';
  segment: TranscriptSegment;
  totalSegments: number;
  recentPreview: string;
  timestamp: number;
}

export interface ActiveWindowChangedEvent {
  type: 'ACTIVE_WINDOW_CHANGED';
  window: {
    application?: string;
    title?: string;
    processId?: number;
  };
  timestamp: number;
}

export interface ContextUpdatedEvent {
  type: 'CONTEXT_UPDATED';
  payload: ContextPayload;
  timestamp: number;
}

export interface ContextSessionStoppedEvent {
  type: 'CONTEXT_SESSION_STOPPED';
  sessionId: string;
  timestamp: number;
}

export interface ContextErrorEvent {
  type: 'CONTEXT_ERROR';
  source: string;
  error: string;
  recoverable: boolean;
  timestamp: number;
}

export type ContextEvent =
  | ContextSessionStartedEvent
  | TranscriptUpdatedEvent
  | ActiveWindowChangedEvent
  | ContextUpdatedEvent
  | ContextSessionStoppedEvent
  | ContextErrorEvent;
