import { Workspace, WorkspaceInput } from '../../shared/types';
import { WorkspaceInputSchema, WorkspaceSchema } from '../../shared/schemas';

export class WorkspaceValidator {
  public static validateInput(input: unknown): WorkspaceInput {
    return WorkspaceInputSchema.parse(input);
  }

  public static validateFull(workspace: unknown): Workspace {
    return WorkspaceSchema.parse(workspace);
  }

  public static isUrlReachableSyntax(urlStr?: string): boolean {
    if (!urlStr) return false;
    try {
      const parsed = new URL(urlStr);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
