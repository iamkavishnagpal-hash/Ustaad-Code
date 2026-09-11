import { describe, it, expect } from 'vitest';
import { RuntimeStateMachine } from '../../src/main/runtime/runtime-state';

describe('RuntimeStateMachine', () => {
  it('initializes to IDLE status', () => {
    const sm = new RuntimeStateMachine();
    expect(sm.current).toBe('IDLE');
  });

  it('allows valid sequential state transitions', () => {
    const sm = new RuntimeStateMachine();
    expect(sm.transition('ACTIVATING')).toBe(true);
    expect(sm.current).toBe('ACTIVATING');

    expect(sm.transition('OPENING_SOURCE')).toBe(true);
    expect(sm.current).toBe('OPENING_SOURCE');

    expect(sm.transition('VERIFYING')).toBe(true);
    expect(sm.current).toBe('VERIFYING');

    expect(sm.transition('READY')).toBe(true);
    expect(sm.current).toBe('READY');

    expect(sm.transition('STOPPING')).toBe(true);
    expect(sm.transition('IDLE')).toBe(true);
    expect(sm.current).toBe('IDLE');
  });

  it('rejects invalid state jumps', () => {
    const sm = new RuntimeStateMachine();
    // Cannot jump directly from IDLE to READY or RUNNING
    expect(() => sm.transition('READY')).toThrow(/Invalid state transition/);
    expect(() => sm.transition('STOPPING')).toThrow(/Invalid state transition/);
  });

  it('allows transitioning to ERROR from any operational state', () => {
    const sm = new RuntimeStateMachine();
    sm.transition('ACTIVATING');
    expect(sm.transition('ERROR')).toBe(true);
    expect(sm.current).toBe('ERROR');

    // From error can reset to IDLE or restart ACTIVATING
    expect(sm.transition('IDLE')).toBe(true);
  });
});
