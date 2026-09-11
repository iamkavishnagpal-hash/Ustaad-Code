import { ActionType, PermissionLevel } from './workflow-types';

export class ActionPolicy {
  private static readonly PERMISSION_MAP: Record<ActionType, PermissionLevel> = {
    OPEN_URL: 'SAFE',
    OPEN_APPLICATION: 'SAFE',
    SHOW_OVERLAY: 'SAFE',
    HIDE_OVERLAY: 'SAFE',
    START_CONTEXT: 'SAFE',
    STOP_CONTEXT: 'SAFE',
    REQUEST_AI_RESPONSE: 'SAFE',
  };

  public static getPermissionLevel(actionType: ActionType): PermissionLevel {
    return this.PERMISSION_MAP[actionType] || 'RESTRICTED';
  }

  public static isExecutionAllowed(actionType: ActionType, isConfirmed = false): boolean {
    const level = this.getPermissionLevel(actionType);
    if (level === 'SAFE') return true;
    if (level === 'USER_CONFIRMATION') return isConfirmed;
    return false; // RESTRICTED actions strictly denied from automated execution
  }
}
