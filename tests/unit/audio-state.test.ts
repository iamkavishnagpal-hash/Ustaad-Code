import { describe, it, expect } from 'vitest';
import { AudioManager } from '../../src/main/audio/audio-manager';
import { MicrophoneSource } from '../../src/main/audio/microphone-source';
import { SystemAudioSource } from '../../src/main/audio/system-audio-source';

describe('AudioManager and Audio Sources State Logic', () => {
  it('initializes with microphone idle and honest system audio reporting', () => {
    const manager = new AudioManager();
    const state = manager.getState();

    expect(state.microphone).toBe(false);
    expect(state.systemAudio).toBe(false);
    expect(state.muted).toBe(false);
    expect(state.systemAudioSupported).toBe(false);
    expect(state.systemAudioNotice).toContain('unavailable');
  });

  it('toggles mute state and reflects in status', () => {
    const manager = new AudioManager();
    expect(manager.isMuted()).toBe(false);

    manager.toggleMute();
    expect(manager.isMuted()).toBe(true);

    manager.toggleMute();
    expect(manager.isMuted()).toBe(false);
  });

  it('starts and stops microphone capture stream', async () => {
    const mic = new MicrophoneSource();
    const manager = new AudioManager(mic);

    const started = await manager.startListening();
    expect(started).toBe(true);
    expect(manager.isListening()).toBe(true);
    expect(manager.getState().microphone).toBe(true);

    await manager.stopListening();
    expect(manager.isListening()).toBe(false);
    expect(manager.getState().microphone).toBe(false);
  });
});
