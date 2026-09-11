import { RuntimeStatus } from '../../shared/types';

export class RuntimeStateMachine {
  private _status: RuntimeStatus = 'IDLE';

  // Explicit valid state transitions
  private readonly transitions: Record<RuntimeStatus, RuntimeStatus[]> = {
    IDLE: ['ACTIVATING', 'ERROR'],
    ACTIVATING: ['OPENING_SOURCE', 'VERIFYING', 'ERROR', 'IDLE'],
    OPENING_SOURCE: ['VERIFYING', 'ERROR', 'IDLE'],
    VERIFYING: ['READY', 'ERROR', 'IDLE'],
    READY: ['CAPTURING', 'RUNNING', 'STOPPING', 'ERROR', 'IDLE'],
    CAPTURING: ['TRANSCRIBING', 'CONTEXT_READY', 'READY', 'STOPPING', 'ERROR'],
    TRANSCRIBING: ['CONTEXT_READY', 'CAPTURING', 'READY', 'STOPPING', 'ERROR'],
    CONTEXT_READY: ['CAPTURING', 'TRANSCRIBING', 'READY', 'STOPPING', 'ERROR'],
    RUNNING: ['STOPPING', 'ERROR', 'IDLE'],
    STOPPING: ['IDLE', 'ERROR'],
    ERROR: ['IDLE', 'ACTIVATING', 'READY'],
  };

  constructor(initialState: RuntimeStatus = 'IDLE') {
    this._status = initialState;
  }

  public get current(): RuntimeStatus {
    return this._status;
  }

  public transition(target: RuntimeStatus): boolean {
    const allowed = this.transitions[this._status];
    if (!allowed.includes(target)) {
      throw new Error(`Invalid state transition attempted: ${this._status} -> ${target}`);
    }
    this._status = target;
    return true;
  }

  public reset(): void {
    this._status = 'IDLE';
  }
}
