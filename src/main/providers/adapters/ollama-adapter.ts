import { LlmProvider, LlmRequest, LlmResponse, ProviderConfig, ProviderHealth } from '../provider-types';
import { ProviderError } from '../provider-errors';
import { ContextAssembler } from '../context-assembler';
import crypto from 'node:crypto';

export class OllamaAdapter implements LlmProvider {
  public readonly id = 'ollama';
  public readonly name = 'Ollama (Local)';
  public readonly defaultModel = 'llama3.2';
  public readonly defaultEndpoint = 'http://127.0.0.1:11434';

  public async healthCheck(config: ProviderConfig): Promise<ProviderHealth> {
    const endpoint = config.endpoint || this.defaultEndpoint;
    const model = config.model || this.defaultModel;
    const start = Date.now();

    try {
      const resp = await fetch(`${endpoint}/api/tags`, { method: 'GET' });

      if (!resp.ok) {
        return {
          providerId: this.id,
          available: false,
          model,
          error: `Ollama returned status ${resp.status}`,
          latencyMs: Date.now() - start,
        };
      }

      const data = await resp.json();
      const modelsList: string[] = (data.models || []).map((m: any) => m.name);
      const hasModel = modelsList.some((m) => m.startsWith(model));

      return {
        providerId: this.id,
        available: true,
        model,
        error: hasModel ? undefined : `Model "${model}" not found in Ollama tags. Available: ${modelsList.slice(0, 3).join(', ')}`,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        available: false,
        model,
        error: `Ollama service unreachable at ${endpoint}: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  public async streamResponse(
    request: LlmRequest,
    config: ProviderConfig,
    onToken: (token: string) => void
  ): Promise<LlmResponse> {
    const endpoint = config.endpoint || this.defaultEndpoint;
    const model = request.model || config.model || this.defaultModel;

    const { systemPrompt, userContent } = ContextAssembler.formatPrompt(request);
    const start = Date.now();

    const body = {
      model,
      prompt: `${systemPrompt}\n\nUser: ${userContent}\nAssistant:`,
      stream: true,
      options: {
        temperature: request.options?.temperature ?? config.temperature ?? 0.7,
        num_predict: request.options?.maxTokens ?? config.maxTokens ?? 1024,
      },
    };

    let resp: Response;
    try {
      resp = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new ProviderError(this.id, `Failed to reach local Ollama at ${endpoint}: ${err.message}`, { isNetworkError: true });
    }

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError(this.id, errText, { statusCode: resp.status });
    }

    if (!resp.body) {
      throw new ProviderError(this.id, 'Empty response stream received from Ollama');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed);
          if (data.response) {
            fullText += data.response;
            onToken(data.response);
          }
        } catch {
          // Buffering partial line
        }
      }
    }

    return {
      id: crypto.randomUUID(),
      providerId: this.id,
      model,
      content: fullText,
      durationMs: Date.now() - start,
    };
  }
}
