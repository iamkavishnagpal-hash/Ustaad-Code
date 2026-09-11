import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { OverlayConfigSchema } from '../../shared/schemas';
import { z } from 'zod';

export type OverlayConfig = z.infer<typeof OverlayConfigSchema>;

export class OverlayManager {
  private overlayWindow: BrowserWindow | null = null;

  public getWindow(): BrowserWindow | null {
    return this.overlayWindow;
  }

  public createOrGetOverlay(config?: OverlayConfig): BrowserWindow {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      return this.overlayWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const overlayWidth = config?.width || 420;
    const overlayHeight = 160; // Sleek compact HUD height for Phase 1

    // Default top-right position with margin
    const x = screenWidth - overlayWidth - 24;
    const y = 32;

    this.overlayWindow = new BrowserWindow({
      width: overlayWidth,
      height: overlayHeight,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: config?.alwaysOnTop ?? true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../../preload/overlay-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    if (config?.opacity) {
      this.overlayWindow.setOpacity(config.opacity);
    }

    // Always on top level on Windows
    this.overlayWindow.setAlwaysOnTop(config?.alwaysOnTop ?? true, 'screen-saver');

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
      this.overlayWindow.loadURL(`${devServerUrl}/overlay.html`);
    } else {
      this.overlayWindow.loadFile(path.join(__dirname, '../../renderer/overlay/index.html'));
    }

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });

    return this.overlayWindow;
  }

  public show(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.showInactive(); // Shows without stealing user focus from current app
    }
  }

  public hide(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
    }
  }

  public close(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
      this.overlayWindow = null;
    }
  }
}
