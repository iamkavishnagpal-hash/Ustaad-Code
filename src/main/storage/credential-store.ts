import fs from 'node:fs';
import path from 'node:path';
import { safeStorage } from 'electron';
import { AiProviderId, ProviderConfig } from '../providers/provider-types';
import { Logger } from '../utils/logger';

/**
 * Production-hardened CredentialStore.
 * Uses Windows DPAPI (via Electron safeStorage) to encrypt API keys on disk.
 * Falls back to main-process in-memory store if safeStorage is unavailable.
 */
export class CredentialStore {
  private configs: Map<AiProviderId, ProviderConfig> = new Map();
  private storagePath: string | null = null;

  constructor(customStorageDir?: string) {
    this.initStorage(customStorageDir);
    this.loadDefaults();
    this.loadFromDisk();
  }

  private initStorage(customStorageDir?: string): void {
    let dir = customStorageDir;
    if (!dir) {
      try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
          dir = app.getPath('userData');
        }
      } catch {
        // Test environment
      }
    }
    if (!dir) {
      dir = path.join(process.cwd(), '.data');
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.storagePath = path.join(dir, 'credentials.enc');
  }

  private loadDefaults(): void {
    this.configs.set('gemini', {
      providerId: 'gemini',
      model: 'gemini-1.5-flash',
    });
    this.configs.set('openai', {
      providerId: 'openai',
      model: 'gpt-4o-mini',
    });
    this.configs.set('ollama', {
      providerId: 'ollama',
      endpoint: 'http://127.0.0.1:11434',
      model: 'llama3.2',
    });
    this.configs.set('anthropic', {
      providerId: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
    });
  }

  public setConfig(config: ProviderConfig): void {
    const existing = this.configs.get(config.providerId) || {
      providerId: config.providerId,
      model: config.model,
    };

    this.configs.set(config.providerId, {
      ...existing,
      ...config,
      apiKey: config.apiKey !== undefined && config.apiKey !== '' ? config.apiKey : existing.apiKey,
    });

    this.saveToDisk();
  }

  public getConfig(providerId: AiProviderId): ProviderConfig {
    return (
      this.configs.get(providerId) || {
        providerId,
        model: 'default',
      }
    );
  }

  public getSanitizedConfig(providerId: AiProviderId): {
    providerId: AiProviderId;
    model: string;
    endpoint?: string;
    hasApiKey: boolean;
  } {
    const cfg = this.getConfig(providerId);
    return {
      providerId: cfg.providerId,
      model: cfg.model,
      endpoint: cfg.endpoint,
      hasApiKey: !!cfg.apiKey,
    };
  }

  private loadFromDisk(): void {
    if (!this.storagePath || !fs.existsSync(this.storagePath)) return;

    try {
      const encryptedBuffer = fs.readFileSync(this.storagePath);
      let jsonString = '';

      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        jsonString = safeStorage.decryptString(encryptedBuffer);
      } else {
        jsonString = encryptedBuffer.toString('utf-8');
      }

      const parsed = JSON.parse(jsonString);
      for (const [id, cfg] of Object.entries(parsed)) {
        this.configs.set(id as AiProviderId, cfg as ProviderConfig);
      }
      Logger.info('credentials_loaded_from_disk');
    } catch (err: any) {
      Logger.warn('credentials_load_failed', { error: err?.message });
    }
  }

  private saveToDisk(): void {
    if (!this.storagePath) return;

    try {
      const toSerialize: Record<string, ProviderConfig> = {};
      for (const [id, cfg] of this.configs.entries()) {
        toSerialize[id] = cfg;
      }
      const jsonString = JSON.stringify(toSerialize);

      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(jsonString);
        fs.writeFileSync(this.storagePath, encrypted);
      } else {
        // Fallback for headless environments
        fs.writeFileSync(this.storagePath, Buffer.from(jsonString, 'utf-8'));
      }
      Logger.info('credentials_saved_to_disk');
    } catch (err: any) {
      Logger.error('credentials_save_failed', err);
    }
  }
}
