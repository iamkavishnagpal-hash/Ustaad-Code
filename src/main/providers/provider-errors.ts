import { AiProviderId } from './provider-types';

export class ProviderError extends Error {
  public readonly providerId: AiProviderId;
  public readonly statusCode?: number;
  public readonly isAuthError: boolean;
  public readonly isNetworkError: boolean;

  constructor(
    providerId: AiProviderId,
    message: string,
    options: { statusCode?: number; isAuthError?: boolean; isNetworkError?: boolean } = {}
  ) {
    // Sanitizes any accidental API key leaks in error message
    const sanitizedMessage = ProviderError.sanitizeMessage(message);
    super(`[${providerId.toUpperCase()}] ${sanitizedMessage}`);
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.statusCode = options.statusCode;
    this.isAuthError = options.isAuthError ?? false;
    this.isNetworkError = options.isNetworkError ?? false;
  }

  public static sanitizeMessage(raw: string): string {
    if (!raw) return 'Unknown provider error';
    // Mask potential API keys (e.g. sk-..., AIza...)
    return raw
      .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza••••••••')
      .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-••••••••')
      .replace(/sk-ant-[a-zA-Z0-9-_]{20,}/g, 'sk-ant-••••••••');
  }
}
