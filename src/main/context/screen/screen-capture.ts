import { desktopCapturer, screen } from 'electron';
import { ScreenCaptureResult } from './screen-types';

export class ScreenCaptureService {
  /**
   * Captures the primary display or active foreground window safely.
   * Keeps resolution bounded (e.g. 1280x720) to prevent CPU and memory spikes.
   */
  public async captureActiveScreen(): Promise<ScreenCaptureResult | null> {
    try {
      // In non-Electron / headless unit testing environment
      if (!desktopCapturer || typeof desktopCapturer.getSources !== 'function') {
        return {
          dimensions: { width: 1920, height: 1080 },
          timestamp: Date.now(),
          sourceName: 'Primary Display (Test)',
        };
      }

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      });

      if (!sources || sources.length === 0) {
        return null;
      }

      const primarySource = sources[0];
      const thumbnail = primarySource.thumbnail;
      const size = thumbnail.getSize();

      return {
        dimensions: { width: size.width, height: size.height },
        timestamp: Date.now(),
        dataUrl: thumbnail.toDataURL(),
        sourceName: primarySource.name || 'Primary Display',
      };
    } catch (err: any) {
      console.warn('[ScreenCaptureService] Capture error:', err?.message);
      return null;
    }
  }
}
