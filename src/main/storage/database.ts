import path from 'node:path';
import fs from 'node:fs';
import DatabaseConstructor from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';

export class SQLiteBridge {
  private dbPath: string;
  private db: BetterSqlite3Database;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      let userDataPath = path.join(process.cwd(), '.data');
      try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
          userDataPath = app.getPath('userData');
        }
      } catch {
        // Fallback for tests outside Electron runtime
      }

      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      this.dbPath = path.join(userDataPath, 'ustaadg.db');
    }

    // Initialize native SQLite database connection
    this.db = new DatabaseConstructor(this.dbPath);

    // Enable Write-Ahead Logging (WAL) and foreign keys for high-performance concurrent reads/writes
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initSchema();
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  private initSchema(): void {
    const schemaSql = `
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        source_json TEXT NOT NULL,
        activation_json TEXT NOT NULL,
        hotkey TEXT NOT NULL UNIQUE,
        privacy_json TEXT NOT NULL,
        overlay_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS runtime_sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        verification_json TEXT,
        error_message TEXT,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        trigger_json TEXT NOT NULL,
        conditions_json TEXT NOT NULL,
        steps_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_workspaces_hotkey ON workspaces(hotkey);
      CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON runtime_sessions(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON workflows(workspace_id);
    `;

    this.db.exec(schemaSql);
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return (row as T) || null;
  }

  public run(sql: string, params: any[] = []): { changes: number; lastrowid: number } {
    const stmt = this.db.prepare(sql);
    const res = stmt.run(...params);
    return {
      changes: res.changes,
      lastrowid: Number(res.lastInsertRowid),
    };
  }

  public close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }
}
