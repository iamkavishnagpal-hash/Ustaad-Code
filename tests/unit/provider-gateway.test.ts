import { describe, it, expect, vi } from 'vitest';
import { ProviderRegistry } from '../../src/main/providers/provider-registry';
import { CredentialStore } from '../../src/main/storage/credential-store';
import { ProviderGateway } from '../../src/main/providers/provider-gateway';
import { ContextAssembler } from '../../src/main/providers/context-assembler';
import { LlmRequest, LlmProvider } from '../../src/main/providers/provider-types';

describe('Phase 3: LLM Provider Gateway & Runtime', () => {
  const mockContext = {
    workspaceId: 'ws-test',
    sessionId: 'sess-test',
    timestamp: 1789150000000,
    transcript: {
      text: 'Analyzing latency on query execution plan for BigQuery.',
      startedAt: 1789149000000,
      updatedAt: 1789150000000,
      segmentCount: 2,
    },
    activeWindow: {
      application: 'Code',
      title: 'VS Code - UstaadG Pipeline',
      processId: 10420,
    },
    sources: {
      microphone: true,
      systemAudio: false,
      activeWindow: true,
      screen: false,
    },
  };

  it('formats prompt accurately through ContextAssembler', () => {
    const request: LlmRequest = {
      workspaceId: 'ws-test',
      sessionId: 'sess-test',
      providerId: 'gemini',
      systemInstruction: 'Focus on BigQuery SQL performance tuning.',
      userPrompt: 'How can I optimize this?',
      context: mockContext,
    };

    const { systemPrompt, userContent } = ContextAssembler.formatPrompt(request);

    expect(systemPrompt).toContain('BigQuery SQL performance tuning');
    expect(systemPrompt).toContain('VS Code - UstaadG Pipeline');
    expect(systemPrompt).toContain('Analyzing latency on query execution plan');
    expect(userContent).toBe('How can I optimize this?');
  });

  it('registers all 4 standard providers: Gemini, OpenAI, Ollama, Anthropic', () => {
    const registry = new ProviderRegistry();
    const list = registry.list();

    expect(list.length).toBe(4);
    const ids = list.map((p) => p.id);
    expect(ids).toContain('gemini');
    expect(ids).toContain('openai');
    expect(ids).toContain('ollama');
    expect(ids).toContain('anthropic');
  });

  it('manages provider credentials securely without exposing raw secrets', () => {
    const store = new CredentialStore();
    store.setConfig({
      providerId: 'gemini',
      apiKey: 'AIzaSyTestSecretKey1234567890abcdef',
      model: 'gemini-1.5-pro',
    });

    const sanitized = store.getSanitizedConfig('gemini');
    expect(sanitized.hasApiKey).toBe(true);
    expect(sanitized.model).toBe('gemini-1.5-pro');
    expect((sanitized as any).apiKey).toBeUndefined();
  });

  it('streams incremental tokens from provider through ProviderGateway', async () => {
    const registry = new ProviderRegistry();
    const credentialStore = new CredentialStore();

    // Custom mock provider to verify streaming without hitting real cloud network
    const mockProvider: LlmProvider = {
      id: 'gemini',
      name: 'Mock Gemini',
      defaultModel: 'mock-model',
      healthCheck: vi.fn().mockResolvedValue({
        providerId: 'gemini',
        available: true,
        model: 'mock-model',
      }),
      streamResponse: vi.fn().mockImplementation(async (_req, _cfg, onToken) => {
        onToken('Start ');
        onToken('by ');
        onToken('checking ');
        onToken('shuffle.');
        return {
          id: 'res-1',
          providerId: 'gemini',
          model: 'mock-model',
          content: 'Start by checking shuffle.',
          durationMs: 42,
        };
      }),
    };

    registry.register(mockProvider);
    const gateway = new ProviderGateway(registry, credentialStore);

    const receivedTokens: string[] = [];
    const eventTokens: string[] = [];

    gateway.on('llm:chunk', ({ token }) => {
      eventTokens.push(token);
    });

    const response = await gateway.streamResponse(
      {
        workspaceId: 'ws-test',
        sessionId: 'sess-test',
        providerId: 'gemini',
        context: mockContext,
      },
      (token) => {
        receivedTokens.push(token);
      }
    );

    expect(response.content).toBe('Start by checking shuffle.');
    expect(receivedTokens).toEqual(['Start ', 'by ', 'checking ', 'shuffle.']);
    expect(eventTokens).toEqual(['Start ', 'by ', 'checking ', 'shuffle.']);
  });
});
