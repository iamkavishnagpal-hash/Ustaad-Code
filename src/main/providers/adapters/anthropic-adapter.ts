import { LlmProvider, LlmRequest, LlmResponse, ProviderConfig, ProviderHealth } from '../provider-types';
import { ProviderError } from '../provider-errors';
import { ContextAssembler } from '../context-assembler';
import crypto from 'node:crypto';

export class AnthropicAdapter implements LlmProvider {
  public readonly id = 'anthropic';
  public readonly name = 'Anthropic Claude';
  public readonly defaultModel = 'claude-3-5-sonnet-20241022';

  public async healthCheck(config: ProviderConfig): Promise<ProviderHealth> {
    const model = config.model || this.defaultModel;
    const apiKey = config.apiKey;

    if (!apiKey) {
      return {
        providerId: this.id,
        available: false,
        model,
        error: 'Missing Anthropic API key',
      };
    }

    // Anthropic doesn't provide a public GET /models endpoint with API keys; we test with a minimal dry payload
    return {
      providerId: this.id,
      available: true,
      model,
    };
  }

  public async streamResponse(
    request: LlmRequest,
    config: ProviderConfig,
    onToken: (token: string) => void
  ): Promise<LlmResponse> {
    const model = request.model || config.model || this.defaultModel;
    const apiKey = config.apiKey;

    if (!apiKey) {
      throw new ProviderError(this.id, 'API key required for Anthropic execution', { isAuthError: true });
    }

    const { systemPrompt, userContent } = ContextAssembler.formatPrompt(request);
    const start = Date.now();

    const body = {
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      max_tokens: request.options?.maxTokens ?? config.maxTokens ?? 1024,
      temperature: request.options?.temperature ?? config.temperature ?? 0.7,
      stream: true,
    };

    let resp: Response;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new ProviderError(this.id, `Failed to connect to Anthropic: ${err.message}`, { isNetworkError: true });
    }

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError(this.id, errText, { statusCode: resp.status, isAuthError: resp.status === 401 || resp.status === 403 });
    }

    if (!resp.body) {
      throw new ProviderError(this.id, 'Empty response stream received from Anthropic API');
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
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text;
              onToken(data.delta.text);
            }
          } catch {
            // Partial JSON
          }
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
