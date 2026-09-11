import { describe, it, expect } from 'vitest';
import { WorkspaceSchema, SourceSchema, PrivacyConfigSchema } from '../../src/shared/schemas';
import { WorkspaceValidator } from '../../src/main/workspaces/workspace-validator';

describe('WorkspaceValidator & Schemas', () => {
  it('validates a correct web workspace schema', () => {
    const valid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Data Engineering Review',
      description: 'Daily team sync notes',
      source: {
        kind: 'web',
        provider: 'chatgpt',
        url: 'https://chatgpt.com/g/p-12345',
      },
      activation: {
        openSource: true,
        focusSource: true,
        showOverlay: true,
        verifyWindow: true,
      },
      hotkey: 'Ctrl+Shift+H',
      privacy: {
        captureProtection: false,
        taskbarVisibility: 'shown',
        overlayCapturePolicy: 'normal',
      },
      overlay: {
        alwaysOnTop: true,
        opacity: 0.9,
        width: 420,
        position: 'top-right',
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    expect(() => WorkspaceSchema.parse(valid)).not.toThrow();
  });

  it('rejects an empty workspace name', () => {
    const invalid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: '',
      source: {
        kind: 'web',
        provider: 'chatgpt',
        url: 'https://chatgpt.com',
      },
      hotkey: 'Ctrl+Shift+H',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(() => WorkspaceValidator.validateFull(invalid)).toThrow();
  });

  it('verifies valid and invalid URL syntaxes', () => {
    expect(WorkspaceValidator.isUrlReachableSyntax('https://chatgpt.com')).toBe(true);
    expect(WorkspaceValidator.isUrlReachableSyntax('http://localhost:11434')).toBe(true);
    expect(WorkspaceValidator.isUrlReachableSyntax('ftp://not-supported')).toBe(false);
    expect(WorkspaceValidator.isUrlReachableSyntax('invalid-url-string')).toBe(false);
  });
});
