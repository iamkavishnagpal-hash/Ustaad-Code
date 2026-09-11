import { AiProviderId, LlmProvider } from './provider-types';
import { GeminiAdapter } from './adapters/gemini-adapter';
import { OpenAiAdapter } from './adapters/openai-adapter';
import { OllamaAdapter } from './adapters/ollama-adapter';
import { AnthropicAdapter } from './adapters/anthropic-adapter';

export class ProviderRegistry {
  private providers: Map<AiProviderId, LlmProvider> = new Map();

  constructor() {
    this.register(new GeminiAdapter());
    this.register(new OpenAiAdapter());
    this.register(new OllamaAdapter());
    this.register(new AnthropicAdapter());
  }

  public register(provider: LlmProvider): void {
    this.providers.set(provider.id, provider);
  }

  public get(id: AiProviderId): LlmProvider | undefined {
    return this.providers.get(id);
  }

  public list(): { id: AiProviderId; name: string; defaultModel: string }[] {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      defaultModel: p.defaultModel,
    }));
  }
}
