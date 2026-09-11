import { EventEmitter } from 'node:events';
import { ScreenCaptureService } from './screen-capture';
import { OcrEngine } from './screen-types';
import { ScreenContextSnapshot } from './screen-types';
import { ActiveApplicationDetector } from '../active-application';

export interface ScreenSourceOptions {
  captureMode?: 'manual' | 'on-change';
  minCaptureIntervalMs?: number;
}

export class ScreenContextSource extends EventEmitter {
  private isCapturing = false;
  private lastCapturedTitle = '';
  private lastCapturedProcess = '';
  private lastCaptureTime = 0;
  private readonly minIntervalMs: number;
  private readonly captureMode: 'manual' | 'on-change';

  constructor(
    private captureService: ScreenCaptureService,
    private ocrEngine: OcrEngine,
    options: ScreenSourceOptions = {}
  ) {
    super();
    this.captureMode = options.captureMode ?? 'on-change';
    this.minIntervalMs = options.minCaptureIntervalMs ?? 5000; // conservative 5s rate-limit
  }

  public async start(): Promise<boolean> {
    this.isCapturing = true;
    this.emit('state:changed', { active: true });
    return true;
  }

  public async stop(): Promise<void> {
    this.isCapturing = false;
    this.emit('state:changed', { active: false });
  }

  public isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Evaluates change detection. Captures only when active foreground app
   * or window title changes, respecting the rate limit.
   */
  public async evaluateChange(force = false): Promise<ScreenContextSnapshot | null> {
    if (!this.isCapturing && !force) return null;

    const now = Date.now();
    const app = ActiveApplicationDetector.getActiveApplication();
    const appChanged =
      app.title !== this.lastCapturedTitle || app.processName !== this.lastCapturedProcess;

    if (!force && (!appChanged || now - this.lastCaptureTime < this.minIntervalMs)) {
      return null;
    }

    try {
      const capture = await this.captureService.captureActiveScreen();
      if (!capture) return null;

      const ocr = await this.ocrEngine.extractText(capture);

      this.lastCapturedTitle = app.title || '';
      this.lastCapturedProcess = app.processName || '';
      this.lastCaptureTime = now;

      const snapshot: ScreenContextSnapshot = {
        application: app.processName,
        title: app.title,
        ocrText: ocr.text,
        dimensions: capture.dimensions,
        capturedAt: now,
      };

      this.emit('screen:context', snapshot);
      return snapshot;
    } catch (err: any) {
      this.emit('error', err?.message || 'Screen capture error');
      return null;
    }
  }
}
