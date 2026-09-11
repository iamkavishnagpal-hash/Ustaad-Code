import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteBridge } from '../../src/main/storage/database';
import { WorkspaceStore } from '../../src/main/storage/workspace-store';
import { SessionStore } from '../../src/main/storage/session-store';
import path from 'node:path';
import fs from 'node:fs';

describe('WorkspaceStore and SessionStore SQLite Integration', () => {
  const testDbPath = path.join(process.cwd(), 'test-ustaadg.db');
  let db: SQLiteBridge;
  let workspaceStore: WorkspaceStore;
  let sessionStore: SessionStore;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new SQLiteBridge(testDbPath);
    workspaceStore = new WorkspaceStore(db);
    sessionStore = new SessionStore(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  it('performs complete workspace CRUD lifecycle in SQLite', () => {
    // 1. Create
    const created = workspaceStore.create({
      name: 'Meeting Review',
      description: 'Daily team notes',
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
      hotkey: 'Ctrl+Shift+M',
      privacy: {
        captureProtection: false,
        taskbarVisibility: 'shown',
        overlayCapturePolicy: 'normal',
      },
      overlay: {
        alwaysOnTop: true,
        opacity: 0.95,
        width: 420,
        position: 'top-right',
      },
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Meeting Review');

    // 2. Read by ID and Hotkey
    const fetched = workspaceStore.getById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Meeting Review');

    const byHotkey = workspaceStore.getByHotkey('ctrl+shift+m');
    expect(byHotkey).not.toBeNull();
    expect(byHotkey?.id).toBe(created.id);

    // 3. Update
    const updated = workspaceStore.update(created.id, {
      name: 'Updated Meeting Review',
    });
    expect(updated.name).toBe('Updated Meeting Review');

    // 4. List
    const all = workspaceStore.list();
    expect(all.length).toBe(1);

    // 5. Delete
    const deleted = workspaceStore.delete(created.id);
    expect(deleted).toBe(true);
    expect(workspaceStore.getById(created.id)).toBeNull();
  });

  it('creates and tracks runtime sessions in SQLite', () => {
    const ws = workspaceStore.create({
      name: 'Session Test WS',
      source: { kind: 'web', provider: 'gemini', url: 'https://gemini.google.com' },
      activation: { openSource: true, focusSource: true, showOverlay: true, verifyWindow: true },
      hotkey: 'Ctrl+Shift+G',
      privacy: { captureProtection: false, taskbarVisibility: 'shown', overlayCapturePolicy: 'normal' },
      overlay: { alwaysOnTop: true, opacity: 0.9, width: 420, position: 'top-right' },
    });

    const session = sessionStore.createSession(ws.id, 'ACTIVATING');
    expect(session.id).toBeDefined();
    expect(session.status).toBe('ACTIVATING');

    sessionStore.updateStatus(session.id, 'READY', {
      passed: true,
      workspaceResolved: true,
      sourceReachable: true,
      sourceLaunched: true,
      overlayMounted: true,
      privacyPolicyApplied: true,
      privacyNotice: 'Verified',
      errors: [],
    });

    const fetched = sessionStore.getSession(session.id);
    expect(fetched?.status).toBe('READY');
    expect(fetched?.verificationReport?.passed).toBe(true);
  });
});
