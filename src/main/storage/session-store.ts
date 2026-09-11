import { SQLiteBridge } from './database';
import { RuntimeSessionRecord, RuntimeStatus, VerificationReport } from '../../shared/types';
import crypto from 'node:crypto';

export class SessionStore {
  constructor(private db: SQLiteBridge) {}

  public createSession(workspaceId: string, initialStatus: RuntimeStatus = 'ACTIVATING'): RuntimeSessionRecord {
    const session: RuntimeSessionRecord = {
      id: crypto.randomUUID(),
      workspaceId,
      status: initialStatus,
      startedAt: Date.now(),
    };

    const sql = `
      INSERT INTO runtime_sessions (id, workspace_id, status, started_at)
      VALUES (?, ?, ?, ?)
    `;
    this.db.run(sql, [session.id, session.workspaceId, session.status, session.startedAt]);

    return session;
  }

  public updateStatus(sessionId: string, status: RuntimeStatus, report?: VerificationReport, errorMessage?: string): void {
    const existing = this.getSession(sessionId);
    const now = Date.now();
    const endedAt = ['STOPPING', 'ERROR', 'IDLE'].includes(status) ? now : (existing?.endedAt || null);

    const sql = `
      UPDATE runtime_sessions
      SET status = ?,
          verification_json = COALESCE(?, verification_json),
          error_message = COALESCE(?, error_message),
          ended_at = ?
      WHERE id = ?
    `;

    this.db.run(sql, [
      status,
      report ? JSON.stringify(report) : null,
      errorMessage || null,
      endedAt,
      sessionId,
    ]);
  }

  public getSession(sessionId: string): RuntimeSessionRecord | null {
    const sql = `
      SELECT id, workspace_id, status, started_at, ended_at, verification_json, error_message
      FROM runtime_sessions
      WHERE id = ?
    `;
    const row = this.db.queryOne(sql, [sessionId]);
    if (!row) return null;

    return {
      id: row.id,
      workspaceId: row.workspace_id,
      status: row.status as RuntimeStatus,
      startedAt: row.started_at,
      endedAt: row.ended_at || undefined,
      verificationReport: row.verification_json ? JSON.parse(row.verification_json) : undefined,
      errorMessage: row.error_message || undefined,
    };
  }

  public getRecentSessions(limit = 10): RuntimeSessionRecord[] {
    const sql = `
      SELECT id, workspace_id, status, started_at, ended_at, verification_json, error_message
      FROM runtime_sessions
      ORDER BY started_at DESC
      LIMIT ?
    `;
    const rows = this.db.query(sql, [limit]);

    return rows.map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      status: row.status as RuntimeStatus,
      startedAt: row.started_at,
      endedAt: row.ended_at || undefined,
      verificationReport: row.verification_json ? JSON.parse(row.verification_json) : undefined,
      errorMessage: row.error_message || undefined,
    }));
  }
}
