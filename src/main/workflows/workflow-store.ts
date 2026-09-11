import { SQLiteBridge } from '../storage/database';
import { Workflow } from './workflow-types';

export class WorkflowStore {
  constructor(private db: SQLiteBridge) {}

  public listByWorkspace(workspaceId: string): Workflow[] {
    const rows = this.db.query(
      `SELECT * FROM workflows WHERE workspace_id = ? ORDER BY created_at ASC`,
      [workspaceId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  public listAll(): Workflow[] {
    const rows = this.db.query(`SELECT * FROM workflows ORDER BY created_at ASC`);
    return rows.map((r) => this.mapRow(r));
  }

  public getById(id: string): Workflow | null {
    const row = this.db.queryOne(`SELECT * FROM workflows WHERE id = ?`, [id]);
    return row ? this.mapRow(row) : null;
  }

  public create(workflow: Workflow): Workflow {
    this.db.run(
      `INSERT INTO workflows (id, workspace_id, name, enabled, trigger_json, conditions_json, steps_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workflow.id,
        workflow.workspaceId,
        workflow.name,
        workflow.enabled ? 1 : 0,
        JSON.stringify(workflow.trigger),
        JSON.stringify(workflow.conditions),
        JSON.stringify(workflow.steps),
        workflow.createdAt,
        workflow.updatedAt,
      ]
    );
    return workflow;
  }

  public update(id: string, partial: Partial<Omit<Workflow, 'id' | 'createdAt'>>): Workflow {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Workflow with id "${id}" not found`);
    }

    const updated: Workflow = {
      ...existing,
      ...partial,
      updatedAt: Date.now(),
    };

    this.db.run(
      `UPDATE workflows
       SET workspace_id = ?, name = ?, enabled = ?, trigger_json = ?, conditions_json = ?, steps_json = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.workspaceId,
        updated.name,
        updated.enabled ? 1 : 0,
        JSON.stringify(updated.trigger),
        JSON.stringify(updated.conditions),
        JSON.stringify(updated.steps),
        updated.updatedAt,
        id,
      ]
    );

    return updated;
  }

  public delete(id: string): boolean {
    const res = this.db.run(`DELETE FROM workflows WHERE id = ?`, [id]);
    return res.changes > 0;
  }

  private mapRow(row: any): Workflow {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      enabled: Boolean(row.enabled),
      trigger: JSON.parse(row.trigger_json),
      conditions: JSON.parse(row.conditions_json),
      steps: JSON.parse(row.steps_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
