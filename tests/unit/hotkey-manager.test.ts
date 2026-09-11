import { describe, it, expect } from 'vitest';
import { normalizeAccelerator } from '../../src/main/hotkeys/accelerator';

describe('HotkeyManager Accelerator Normalization', () => {
  it('normalizes common human hotkey strings to Electron accelerator tokens', () => {
    expect(normalizeAccelerator('ctrl+shift+h')).toBe('CommandOrControl+Shift+H');
    expect(normalizeAccelerator('CTRL+SHIFT+H')).toBe('CommandOrControl+Shift+H');
    expect(normalizeAccelerator('ctrl+alt+k')).toBe('CommandOrControl+Alt+K');
    expect(normalizeAccelerator('win+shift+s')).toBe('Super+Shift+S');
  });

  it('handles spaces and whitespace correctly', () => {
    expect(normalizeAccelerator('ctrl + shift + p')).toBe('CommandOrControl+Shift+P');
  });
});
