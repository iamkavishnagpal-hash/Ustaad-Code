import { ContextPayload } from '../context/context-payload';

export type AiProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface ProviderHealth {
  providerId: AiProviderId;
  available: boolean;
  model: string;
  error?: string;
  latencyMs?: number;
}

export interface ProviderConfig {
  providerId: AiProviderId;
  apiKey?: string;
  endpoint?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmRequest {
  workspaceId: string;
  sessionId: string;
  providerId: AiProviderId;
  model?: string;
  systemInstruction?: string;
  userPrompt?: string;
  context: ContextPayload;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface LlmResponse {
  id: string;
  providerId: AiProviderId;
  model: string;
  content: string;
  finishReason?: string;
  totalTokens?: number;
  durationMs: number;
}

export interface LlmProvider {
  readonly id: AiProviderId;
  readonly name: string;
  readonly defaultModel: string;

  healthCheck(config: ProviderConfig): Promise<ProviderHealth>;

  streamResponse(
    request: LlmRequest,
    config: ProviderConfig,
    onToken: (token: string) => void
  ): Promise<LlmResponse>;
}
