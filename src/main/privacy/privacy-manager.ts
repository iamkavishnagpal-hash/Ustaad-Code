import { BrowserWindow } from 'electron';
import { PrivacyConfigSchema } from '../../shared/schemas';
import { z } from 'zod';

export type PrivacyConfig = z.infer<typeof PrivacyConfigSchema>;

export interface PrivacyEnforcementResult {
  applied: boolean;
  policy: string;
  notice: string;
}

export class PrivacyManager {
  /**
   * Applies Windows capture exclusion policies to the specified window
   * using supported Electron/Windows APIs (setContentProtection).
   */
  public applyWindowProtection(window: BrowserWindow, config: PrivacyConfig): PrivacyEnforcementResult {
    if (!window || window.isDestroyed()) {
      return {
        applied: false,
        policy: config.overlayCapturePolicy,
        notice: 'Target window is unavailable',
      };
    }

    if (config.overlayCapturePolicy === 'exclude-when-supported' || config.captureProtection) {
      try {
        // Windows API: SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE / WDA_MONITOR)
        window.setContentProtection(true);
        return {
          applied: true,
          policy: config.overlayCapturePolicy,
          notice: 'Capture protection active for supported Windows capture paths.',
        };
      } catch (err: any) {
        return {
          applied: false,
          policy: config.overlayCapturePolicy,
          notice: `OS capture protection call failed: ${err.message}`,
        };
      }
    } else {
      window.setContentProtection(false);
      return {
        applied: true,
        policy: 'normal',
        notice: 'Normal desktop capture policy active.',
      };
    }
  }
}
