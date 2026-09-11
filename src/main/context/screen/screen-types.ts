export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface ScreenCaptureResult {
  dimensions: ScreenDimensions;
  timestamp: number;
  dataUrl?: string;
  sourceName: string;
}

export interface OcrResult {
  text: string;
  confidence: number;
  linesCount: number;
}

export interface ScreenContextSnapshot {
  application?: string;
  title?: string;
  ocrText?: string;
  dimensions?: ScreenDimensions;
  capturedAt: number;
}

export interface OcrEngine {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  extractText(capture: ScreenCaptureResult): Promise<OcrResult>;
}
