import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppLifecycleManager } from '../../src/main/lifecycle/app-lifecycle';
import { Logger } from '../../src/main/utils/logger';
import { AppSettingsStore } from '../../src/main/storage/app-settings';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 7 — Production Hardening & Application Lifecycle', () => {
  describe('Logger Redaction', () => {
    it('redacts sensitive API keys and authorization headers from logs', () => {
      const sanitized = Logger.sanitize({
        apiKey: 'sk-ant-api03-secretkey1234567890',
        token: 'ghp_secretTokenHere9999',
        authorization: 'Bearer secret_jwt_token',
        nested: {
          clientSecret: 'super-secret-password',
          safeParam: 'public-data',
        },
      });

      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.nested.clientSecret).toBe('[REDACTED]');
      expect(sanitized.nested.safeParam).toBe('public-data');
    });
  });

  describe('AppSettingsStore', () => {
    const testSettingsPath = 'test-settings.json';

    beforeEach(() => {
      if (fs.existsSync(testSettingsPath)) {
        fs.unlinkSync(testSettingsPath);
      }
    });

    afterEach(() => {
      if (fs.existsSync(testSettingsPath)) {
        fs.unlinkSync(testSettingsPath);
      }
    });

    it('loads default settings when no settings file exists', () => {
      const store = new AppSettingsStore(testSettingsPath);
      const settings = store.get();
      expect(settings.startWithWindows).toBe(false);
      expect(settings.startMinimized).toBe(false);
      expect(settings.theme).toBe('dark');
    });

    it('updates and persists settings safely', () => {
      const store = new AppSettingsStore(testSettingsPath);
      const updated = store.update({
        startWithWindows: true,
        startMinimized: true,
      });
      expect(updated.startWithWindows).toBe(true);
      expect(updated.startMinimized).toBe(true);
    });
  });

  describe('AppLifecycleManager', () => {
    let mockRuntime: any;
    let mockWorkflowRuntime: any;
    let mockHotkeyManager: any;
    let mockWindowManager: any;
    let mockTrayManager: any;
    let mockDb: any;
    let mockIntegrationRegistry: any;
    let mockCredentialStore: any;
    let mockSettingsStore: any;

    beforeEach(() => {
      mockRuntime = {
        stop: vi.fn().mockResolvedValue(undefined),
        getSnapshot: vi.fn().mockReturnValue({ status: 'IDLE' }),
      };
      mockWorkflowRuntime = {
        cancelWorkflow: vi.fn(),
        unbindWorkflowHotkey: vi.fn(),
      };
      mockHotkeyManager = {
        unregisterAll: vi.fn(),
        registeredHotkeys: new Map([['Ctrl+Alt+H', {}]]),
      };
      mockWindowManager = {
        overlayManager: { close: vi.fn() },
        getMainWindow: vi.fn().mockReturnValue({ isDestroyed: () => false, destroy: vi.fn() }),
      };
      mockTrayManager = {
        destroy: vi.fn(),
      };
      mockDb = {
        close: vi.fn(),
      };
      mockIntegrationRegistry = {
        getStatuses: vi.fn().mockResolvedValue([
          { id: 'vscode', name: 'VS Code', available: true, capabilities: [] },
          { id: 'git', name: 'Git', available: true, capabilities: [] },
        ]),
      };
      mockCredentialStore = {
        getSanitizedConfig: vi.fn().mockReturnValue({ hasApiKey: true }),
        getConfig: vi.fn().mockReturnValue({ endpoint: 'http://localhost:11434' }),
      };
      mockSettingsStore = {
        get: vi.fn().mockReturnValue({ startWithWindows: false }),
      };
    });

    it('gracefully performs coordinated shutdown in the required sequence', async () => {
      const lifecycle = new AppLifecycleManager(
        mockRuntime,
        mockWorkflowRuntime,
        mockHotkeyManager,
        mockWindowManager,
        mockTrayManager,
        mockDb,
        mockIntegrationRegistry,
        mockCredentialStore,
        mockSettingsStore
      );

      lifecycle.setReady();
      expect(lifecycle.getState()).toBe('RUNNING');

      // Prevent process.exit from terminating the test runner
      const originalExit = process.exit;
      process.exit = vi.fn() as any;

      try {
        await lifecycle.gracefulShutdown();

        expect(mockWorkflowRuntime.cancelWorkflow).toHaveBeenCalled();
        expect(mockRuntime.stop).toHaveBeenCalled();
        expect(mockHotkeyManager.unregisterAll).toHaveBeenCalled();
        expect(mockWindowManager.overlayManager.close).toHaveBeenCalled();
        expect(mockTrayManager.destroy).toHaveBeenCalled();
        expect(mockDb.close).toHaveBeenCalled();
        expect(lifecycle.getState()).toBe('EXITED');
      } finally {
        process.exit = originalExit;
      }
    });

    it('produces diagnostic reports with subsystem status', async () => {
      const lifecycle = new AppLifecycleManager(
        mockRuntime,
        mockWorkflowRuntime,
        mockHotkeyManager,
        mockWindowManager,
        mockTrayManager,
        mockDb,
        mockIntegrationRegistry,
        mockCredentialStore,
        mockSettingsStore
      );

      lifecycle.setReady();
      const diagnostics = await lifecycle.getDiagnostics();

      expect(diagnostics.lifecycleState).toBe('RUNNING');
      expect(diagnostics.databaseStatus).toBe('CONNECTED');
      expect(diagnostics.registeredHotkeys).toContain('Ctrl+Alt+H');
      expect(diagnostics.integrations.length).toBe(2);
      expect(diagnostics.credentialsConfigured.gemini).toBe(true);
    });
  });
});
