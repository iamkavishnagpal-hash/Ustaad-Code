import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScreenContextSource } from '../../src/main/context/screen/screen-source';
import { ScreenCaptureService } from '../../src/main/context/screen/screen-capture';
import { WindowsOcrEngine } from '../../src/main/context/screen/ocr-engine';
import { ActiveApplicationDetector } from '../../src/main/context/active-application';

describe('Phase 4: Screen & Vision Context Runtime', () => {
  let captureService: ScreenCaptureService;
  let ocrEngine: WindowsOcrEngine;
  let screenSource: ScreenContextSource;

  beforeEach(() => {
    captureService = new ScreenCaptureService();
    ocrEngine = new WindowsOcrEngine();
    screenSource = new ScreenContextSource(captureService, ocrEngine, {
      minCaptureIntervalMs: 10,
    });
  });

  afterEach(async () => {
    await screenSource.stop();
    vi.restoreAllMocks();
  });

  it('extracts heuristic visual text safely through WindowsOcrEngine', async () => {
    const ocr = await ocrEngine.extractText({
      dimensions: { width: 1920, height: 1080 },
      timestamp: Date.now(),
      sourceName: 'VS Code - Dataform Pipeline',
    });

    expect(ocr.confidence).toBeGreaterThan(0.9);
    expect(ocr.text).toContain('VS Code - Dataform Pipeline');
    expect(ocr.text).toContain('1920x1080');
  });

  it('starts and stops screen context source cleanly', async () => {
    expect(screenSource.isActive()).toBe(false);
    await screenSource.start();
    expect(screenSource.isActive()).toBe(true);
    await screenSource.stop();
    expect(screenSource.isActive()).toBe(false);
  });

  it('triggers screen context capture when active application changes', async () => {
    await screenSource.start();

    // Mock active application change
    vi.spyOn(ActiveApplicationDetector, 'getActiveApplication').mockReturnValue({
      title: 'Google Cloud Console - BigQuery Studio',
      processName: 'chrome',
      pid: 14200,
    });

    const snapshot = await screenSource.evaluateChange(true);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.application).toBe('chrome');
    expect(snapshot?.title).toBe('Google Cloud Console - BigQuery Studio');
    expect(snapshot?.dimensions?.width).toBeGreaterThan(0);
    expect(snapshot?.ocrText).toBeDefined();
  });

  it('throttles repetitive captures within minIntervalMs when no change detected', async () => {
    await screenSource.start();

    vi.spyOn(ActiveApplicationDetector, 'getActiveApplication').mockReturnValue({
      title: 'Stable Window',
      processName: 'notepad',
      pid: 1000,
    });

    // First call captures
    const snap1 = await screenSource.evaluateChange(true);
    expect(snap1).not.toBeNull();

    // Immediate second call with identical window skips capture to save CPU/memory
    const snap2 = await screenSource.evaluateChange(false);
    expect(snap2).toBeNull();
  });
});
