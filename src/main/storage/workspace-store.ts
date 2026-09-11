import { SQLiteBridge } from './database';
import { Workspace, WorkspaceInput } from '../../shared/types';
import { WorkspaceSchema } from '../../shared/schemas';
import crypto from 'node:crypto';

export class WorkspaceStore {
  constructor(private db: SQLiteBridge) {}

  public list(): Workspace[] {
    const sql = `
      SELECT id, name, description, source_json, activation_json, hotkey, privacy_json, overlay_json, created_at, updated_at
      FROM workspaces
      ORDER BY updated_at DESC
    `;
    const rows = this.db.query(sql);
    return rows.map(row => this.rowToWorkspace(row));
  }

  public getById(id: string): Workspace | null {
    const sql = `
      SELECT id, name, description, source_json, activation_json, hotkey, privacy_json, overlay_json, created_at, updated_at
      FROM workspaces
      WHERE id = ?
    `;
    const row = this.db.queryOne(sql, [id]);
    return row ? this.rowToWorkspace(row) : null;
  }

  public getByHotkey(hotkey: string): Workspace | null {
    const normalized = hotkey.trim().toLowerCase();
    const sql = `
      SELECT id, name, description, source_json, activation_json, hotkey, privacy_json, overlay_json, created_at, updated_at
      FROM workspaces
      WHERE LOWER(hotkey) = ?
    `;
    const row = this.db.queryOne(sql, [normalized]);
    return row ? this.rowToWorkspace(row) : null;
  }

  public create(input: WorkspaceInput): Workspace {
    const now = Date.now();
    const workspace: Workspace = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    WorkspaceSchema.parse(workspace);

    const sql = `
      INSERT INTO workspaces (id, name, description, source_json, activation_json, hotkey, privacy_json, overlay_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.run(sql, [
      workspace.id,
      workspace.name,
      workspace.description || '',
      JSON.stringify(workspace.source),
      JSON.stringify(workspace.activation),
      workspace.hotkey,
      JSON.stringify(workspace.privacy),
      JSON.stringify(workspace.overlay),
      workspace.createdAt,
      workspace.updatedAt,
    ]);

    return workspace;
  }

  public update(id: string, input: Partial<WorkspaceInput>): Workspace {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Workspace with id ${id} not found`);
    }

    const updated: Workspace = {
      ...existing,
      ...input,
      source: input.source ? { ...existing.source, ...input.source } : existing.source,
      activation: input.activation ? { ...existing.activation, ...input.activation } : existing.activation,
      privacy: input.privacy ? { ...existing.privacy, ...input.privacy } : existing.privacy,
      overlay: input.overlay ? { ...existing.overlay, ...input.overlay } : existing.overlay,
      updatedAt: Date.now(),
    };

    WorkspaceSchema.parse(updated);

    const sql = `
      UPDATE workspaces
      SET name = ?,
          description = ?,
          source_json = ?,
          activation_json = ?,
          hotkey = ?,
          privacy_json = ?,
          overlay_json = ?,
          updated_at = ?
      WHERE id = ?
    `;

    this.db.run(sql, [
      updated.name,
      updated.description || '',
      JSON.stringify(updated.source),
      JSON.stringify(updated.activation),
      updated.hotkey,
      JSON.stringify(updated.privacy),
      JSON.stringify(updated.overlay),
      updated.updatedAt,
      updated.id,
    ]);

    return updated;
  }

  public delete(id: string): boolean {
    const sql = `DELETE FROM workspaces WHERE id = ?`;
    const res = this.db.run(sql, [id]);
    return res.changes > 0;
  }

  private rowToWorkspace(row: any): Workspace {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      source: JSON.parse(row.source_json),
      activation: JSON.parse(row.activation_json),
      hotkey: row.hotkey,
      privacy: JSON.parse(row.privacy_json),
      overlay: JSON.parse(row.overlay_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
