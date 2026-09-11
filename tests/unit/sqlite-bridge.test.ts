import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteBridge } from '../../src/main/storage/database';
import path from 'node:path';
import fs from 'node:fs';

describe('SQLiteBridge — In-Process Native SQLite Driver', () => {
  const testDbPath = path.join(process.cwd(), 'test-bridge-unit.db');
  let db: SQLiteBridge;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
    db = new SQLiteBridge(testDbPath);
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

  it('initializes schema without calling external python executable', () => {
    expect(db).toBeDefined();
    expect(db.getDatabasePath()).toBe(testDbPath);

    // Verify schemas were created in-process
    const tables = db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('workspaces', 'runtime_sessions', 'workflows')"
    );
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('workspaces');
    expect(tableNames).toContain('runtime_sessions');
    expect(tableNames).toContain('workflows');
  });

  it('enforces WAL journal mode and foreign keys', () => {
    const journalMode = db.queryOne<{ journal_mode: string }>('PRAGMA journal_mode');
    expect(journalMode?.journal_mode?.toLowerCase()).toBe('wal');

    const foreignKeys = db.queryOne<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(foreignKeys?.foreign_keys).toBe(1);
  });

  it('executes parameterized run, query, and queryOne operations correctly', () => {
    // 1. Insert
    const insertResult = db.run(
      `INSERT INTO workspaces (id, name, description, source_json, activation_json, hotkey, privacy_json, overlay_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ws-1', 'Test Workspace', 'Desc', '{}', '{}', 'Ctrl+Shift+T', '{}', '{}', 1000, 1000]
    );
    expect(insertResult.changes).toBe(1);

    // 2. QueryOne
    const single = db.queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM workspaces WHERE id = ?',
      ['ws-1']
    );
    expect(single).not.toBeNull();
    expect(single?.name).toBe('Test Workspace');

    // 3. Query all
    const all = db.query<{ id: string }>(
      'SELECT id FROM workspaces WHERE hotkey = ?',
      ['Ctrl+Shift+T']
    );
    expect(all.length).toBe(1);
    expect(all[0].id).toBe('ws-1');

    // 4. Update
    const updateResult = db.run(
      'UPDATE workspaces SET name = ? WHERE id = ?',
      ['Updated Name', 'ws-1']
    );
    expect(updateResult.changes).toBe(1);

    // 5. Delete
    const deleteResult = db.run('DELETE FROM workspaces WHERE id = ?', ['ws-1']);
    expect(deleteResult.changes).toBe(1);

    const afterDelete = db.queryOne('SELECT id FROM workspaces WHERE id = ?', ['ws-1']);
    expect(afterDelete).toBeNull();
  });
});
