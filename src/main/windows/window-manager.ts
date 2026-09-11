import { BrowserWindow, app } from 'electron';
import path from 'node:path';
import { OverlayManager } from './overlay-manager';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  public overlayManager: OverlayManager;

  constructor() {
    this.overlayManager = new OverlayManager();
  }

  public createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus();
      return this.mainWindow;
    }

    this.mainWindow = new BrowserWindow({
      width: 1080,
      height: 720,
      minWidth: 800,
      minHeight: 600,
      frame: true,
      title: 'Personal AI Workspace OS',
      webPreferences: {
        preload: path.join(__dirname, '../../preload/main-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
      this.mainWindow.loadURL(devServerUrl);
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../renderer/main/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
