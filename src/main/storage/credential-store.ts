import { AiProviderId, ProviderConfig } from '../providers/provider-types';

/**
 * In-memory secure credential store in the main process.
 * Ensures raw API keys are never stored in plaintext SQLite or sent to renderers.
 */
export class CredentialStore {
  private configs: Map<AiProviderId, ProviderConfig> = new Map();

  constructor() {
    // Defaults
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
      // If no new apiKey was provided, keep the existing one
      apiKey: config.apiKey !== undefined && config.apiKey !== '' ? config.apiKey : existing.apiKey,
    });
  }

  public getConfig(providerId: AiProviderId): ProviderConfig {
    return (
      this.configs.get(providerId) || {
        providerId,
        model: 'default',
      }
    );
  }

  /**
   * Sanitized summary for the UI that masks API keys.
   */
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
}
