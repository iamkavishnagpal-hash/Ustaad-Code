import { EventEmitter } from 'node:events';
import { WorkflowStatus } from './workflow-types';

export interface WorkflowEventPayload {
  workflowId: string;
  workspaceId: string;
  workflowName: string;
  status: WorkflowStatus;
  stepIndex?: number;
  totalSteps?: number;
  stepAction?: string;
  message?: string;
  error?: string;
  timestamp: number;
}

export interface WorkflowExecutionAudit {
  workflowId: string;
  workspaceId: string;
  startedAt: number;
  completedAt?: number;
  status: WorkflowStatus;
  stepsExecuted: number;
  failureReason?: string;
}

export class WorkflowEventsBus extends EventEmitter {
  public notifyWorkflowStarted(payload: WorkflowEventPayload): void {
    this.emit('workflow:started', payload);
  }

  public notifyStepStarted(payload: WorkflowEventPayload): void {
    this.emit('workflow:step-started', payload);
  }

  public notifyStepCompleted(payload: WorkflowEventPayload): void {
    this.emit('workflow:step-completed', payload);
  }

  public notifyWorkflowCompleted(payload: WorkflowEventPayload): void {
    this.emit('workflow:completed', payload);
  }

  public notifyWorkflowFailed(payload: WorkflowEventPayload): void {
    this.emit('workflow:failed', payload);
  }

  public notifyWorkflowCancelled(payload: WorkflowEventPayload): void {
    this.emit('workflow:cancelled', payload);
  }
}
