import { LlmProvider, LlmRequest, LlmResponse, ProviderConfig, ProviderHealth } from '../provider-types';
import { ProviderError } from '../provider-errors';
import { ContextAssembler } from '../context-assembler';
import crypto from 'node:crypto';

export class GeminiAdapter implements LlmProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  public readonly defaultModel = 'gemini-1.5-flash';

  public async healthCheck(config: ProviderConfig): Promise<ProviderHealth> {
    const model = config.model || this.defaultModel;
    const apiKey = config.apiKey;

    if (!apiKey) {
      return {
        providerId: this.id,
        available: false,
        model,
        error: 'Missing Gemini API key',
      };
    }

    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, { method: 'GET' });

      if (!resp.ok) {
        const errorText = await resp.text();
        return {
          providerId: this.id,
          available: false,
          model,
          error: ProviderError.sanitizeMessage(errorText),
          latencyMs: Date.now() - start,
        };
      }

      return {
        providerId: this.id,
        available: true,
        model,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        available: false,
        model,
        error: err?.message || 'Network failure reaching Gemini API',
        latencyMs: Date.now() - start,
      };
    }
  }

  public async streamResponse(
    request: LlmRequest,
    config: ProviderConfig,
    onToken: (token: string) => void
  ): Promise<LlmResponse> {
    const model = request.model || config.model || this.defaultModel;
    const apiKey = config.apiKey;

    if (!apiKey) {
      throw new ProviderError(this.id, 'API key required for Gemini execution', { isAuthError: true });
    }

    const { systemPrompt, userContent } = ContextAssembler.formatPrompt(request);
    const start = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        temperature: request.options?.temperature ?? config.temperature ?? 0.7,
        maxOutputTokens: request.options?.maxTokens ?? config.maxTokens ?? 1024,
      },
    };

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new ProviderError(this.id, `Failed to connect to Gemini: ${err.message}`, { isNetworkError: true });
    }

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError(this.id, errText, { statusCode: resp.status, isAuthError: resp.status === 401 || resp.status === 403 });
    }

    if (!resp.body) {
      throw new ProviderError(this.id, 'Empty response stream received from Gemini API');
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
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const token = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (token) {
              fullText += token;
              onToken(token);
            }
          } catch {
            // Partial JSON; keep buffering
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
