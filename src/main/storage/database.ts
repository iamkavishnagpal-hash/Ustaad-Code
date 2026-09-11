import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export class SQLiteBridge {
  private dbPath: string;

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
    this.initSchema();
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  private executeSql(sql: string, params: any[] = []): any {
    const pythonScript = `
import sys, json, sqlite3

db_path = sys.argv[1]
sql = sys.argv[2]
params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []

try:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute(sql, params)
    
    if sql.strip().upper().startswith("SELECT"):
        rows = [dict(row) for row in cur.fetchall()]
        print(json.dumps({"success": True, "data": rows}))
    else:
        con.commit()
        print(json.dumps({"success": True, "changes": cur.rowcount, "lastrowid": cur.lastrowid}))
    con.close()
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
    sys.exit(1)
`;

    const res = spawnSync('python', ['-c', pythonScript, this.dbPath, sql, JSON.stringify(params)], {
      encoding: 'utf-8',
      windowsHide: true,
    });

    if (res.error) {
      throw new Error(`SQLite execution failed: ${res.error.message}`);
    }

    try {
      const output = JSON.parse(res.stdout.trim());
      if (!output.success) {
        throw new Error(`SQLite query error: ${output.error}`);
      }
      return output;
    } catch (err: any) {
      throw new Error(`Failed to parse SQLite response: ${res.stdout} / ${res.stderr} (${err.message})`);
    }
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

    const pythonScript = `
import sys, sqlite3
db_path = sys.argv[1]
schema = sys.argv[2]
con = sqlite3.connect(db_path)
con.executescript(schema)
con.close()
print("SCHEMA_INITIALIZED")
`;

    const res = spawnSync('python', ['-c', pythonScript, this.dbPath, schemaSql], {
      encoding: 'utf-8',
      windowsHide: true,
    });

    if (res.error || !res.stdout.includes('SCHEMA_INITIALIZED')) {
      throw new Error(`Failed to initialize SQLite schema: ${res.stderr || res.stdout}`);
    }
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    const res = this.executeSql(sql, params);
    return res.data || [];
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public run(sql: string, params: any[] = []): { changes: number; lastrowid: number } {
    const res = this.executeSql(sql, params);
    return { changes: res.changes || 0, lastrowid: res.lastrowid || 0 };
  }
}
