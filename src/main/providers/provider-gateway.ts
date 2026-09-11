import { EventEmitter } from 'node:events';
import { ProviderRegistry } from './provider-registry';
import { CredentialStore } from '../storage/credential-store';
import { AiProviderId, LlmRequest, LlmResponse, ProviderConfig, ProviderHealth } from './provider-types';
import { ProviderError } from './provider-errors';

export class ProviderGateway extends EventEmitter {
  constructor(
    private registry: ProviderRegistry,
    private credentialStore: CredentialStore
  ) {
    super();
  }

  public async testConnection(providerId: AiProviderId, overrideConfig?: Partial<ProviderConfig>): Promise<ProviderHealth> {
    const provider = this.registry.get(providerId);
    if (!provider) {
      return {
        providerId,
        available: false,
        model: 'unknown',
        error: `Provider "${providerId}" is not registered`,
      };
    }

    const saved = this.credentialStore.getConfig(providerId);
    const effectiveConfig: ProviderConfig = {
      ...saved,
      ...overrideConfig,
      providerId,
      model: overrideConfig?.model || saved.model || provider.defaultModel,
    };

    return await provider.healthCheck(effectiveConfig);
  }

  public async streamResponse(
    request: LlmRequest,
    onToken: (token: string) => void
  ): Promise<LlmResponse> {
    const provider = this.registry.get(request.providerId);
    if (!provider) {
      throw new ProviderError(request.providerId, `Provider "${request.providerId}" is not registered`);
    }

    const config = this.credentialStore.getConfig(request.providerId);

    this.emit('llm:started', {
      requestId: `${request.sessionId}-${Date.now()}`,
      providerId: request.providerId,
      model: request.model || config.model,
    });

    try {
      const response = await provider.streamResponse(request, config, (token) => {
        this.emit('llm:chunk', { token, providerId: request.providerId });
        onToken(token);
      });

      this.emit('llm:completed', response);
      return response;
    } catch (err: any) {
      const sanitized = err instanceof ProviderError ? err : new ProviderError(request.providerId, err?.message || 'Execution error');
      this.emit('llm:error', {
        providerId: request.providerId,
        error: sanitized.message,
      });
      throw sanitized;
    }
  }

  public getRegistry(): ProviderRegistry {
    return this.registry;
  }

  public getCredentialStore(): CredentialStore {
    return this.credentialStore;
  }
}
