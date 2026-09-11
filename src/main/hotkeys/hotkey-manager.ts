import { globalShortcut } from 'electron';
import { normalizeAccelerator } from './accelerator';

export interface HotkeyRegistrationResult {
  success: boolean;
  hotkey: string;
  error?: string;
}

export class HotkeyManager {
  private registeredHotkeys: Map<string, () => void> = new Map();

  public normalizeAccelerator(hotkey: string): string {
    return normalizeAccelerator(hotkey);
  }

  public register(rawHotkey: string, callback: () => void): HotkeyRegistrationResult {
    const accelerator = this.normalizeAccelerator(rawHotkey);

    // If already registered by us, unregister first
    if (this.registeredHotkeys.has(accelerator)) {
      globalShortcut.unregister(accelerator);
      this.registeredHotkeys.delete(accelerator);
    }

    try {
      const registered = globalShortcut.register(accelerator, callback);
      if (!registered) {
        return {
          success: false,
          hotkey: accelerator,
          error: `Shortcut "${accelerator}" is already reserved by Windows or another running application. Try another key combination.`,
        };
      }

      this.registeredHotkeys.set(accelerator, callback);
      return {
        success: true,
        hotkey: accelerator,
      };
    } catch (err: any) {
      return {
        success: false,
        hotkey: accelerator,
        error: `Failed to register shortcut "${accelerator}": ${err.message}`,
      };
    }
  }

  public unregister(rawHotkey: string): void {
    const accelerator = this.normalizeAccelerator(rawHotkey);
    if (this.registeredHotkeys.has(accelerator)) {
      globalShortcut.unregister(accelerator);
      this.registeredHotkeys.delete(accelerator);
    }
  }

  public unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.registeredHotkeys.clear();
  }

  public isRegistered(rawHotkey: string): boolean {
    const accelerator = this.normalizeAccelerator(rawHotkey);
    return globalShortcut.isRegistered(accelerator);
  }
}
