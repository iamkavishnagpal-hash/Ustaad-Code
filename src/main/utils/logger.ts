import fs from 'node:fs';
import path from 'node:path';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class Logger {
  private static logFilePath: string | null = null;

  public static initialize(customLogDir?: string): void {
    let logDir = customLogDir;
    if (!logDir) {
      try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
          logDir = path.join(app.getPath('userData'), 'logs');
        }
      } catch {
        // Test environment fallback
      }
    }

    if (!logDir) {
      logDir = path.join(process.cwd(), '.data', 'logs');
    }

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logFilePath = path.join(logDir, 'runtime.log');
  }

  public static getLogPath(): string | null {
    return this.logFilePath;
  }

  public static info(event: string, meta?: Record<string, any>): void {
    this.write('INFO', event, meta);
  }

  public static debug(event: string, meta?: Record<string, any>): void {
    this.write('DEBUG', event, meta);
  }

  public static warn(event: string, meta?: Record<string, any>): void {
    this.write('WARN', event, meta);
  }

  public static error(event: string, error?: any, meta?: Record<string, any>): void {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    this.write('ERROR', event, { ...(meta || {}), error: errorDetails });
  }

  private static write(level: LogLevel, event: string, meta?: Record<string, any>): void {
    const sanitizedMeta = meta ? this.sanitize(meta) : {};
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...sanitizedMeta,
    };

    const formatted = `[${logEntry.timestamp}] [${level}] ${event} ${
      Object.keys(sanitizedMeta).length > 0 ? JSON.stringify(sanitizedMeta) : ''
    }\n`;

    if (process.env.NODE_ENV !== 'production') {
      if (level === 'ERROR') {
        console.error(formatted.trim());
      } else if (level === 'WARN') {
        console.warn(formatted.trim());
      } else {
        console.log(formatted.trim());
      }
    }

    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, formatted, { encoding: 'utf-8' });
      } catch {
        // Disk write failed silently to prevent crashing runtime
      }
    }
  }

  /**
   * Sanitizes objects to prevent leaking credentials, auth headers, or raw tokens
   */
  public static sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveKeys = ['apikey', 'api_key', 'password', 'secret', 'token', 'authorization', 'credential'];
    const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

      if (isSensitive && typeof value === 'string') {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
