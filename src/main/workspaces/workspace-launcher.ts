import { shell } from 'electron';
import { Workspace } from '../../shared/types';
import { WorkspaceValidator } from './workspace-validator';

export interface LaunchResult {
  success: boolean;
  target: string;
  kind: string;
  error?: string;
}

export class WorkspaceLauncher {
  public async launchSource(workspace: Workspace): Promise<LaunchResult> {
    const { source } = workspace;

    if (source.kind === 'web' || source.url) {
      const targetUrl = source.url;
      if (!WorkspaceValidator.isUrlReachableSyntax(targetUrl)) {
        return {
          success: false,
          target: targetUrl || '',
          kind: source.kind,
          error: `Invalid or malformed URL syntax: "${targetUrl}"`,
        };
      }

      try {
        await shell.openExternal(targetUrl!);
        return {
          success: true,
          target: targetUrl!,
          kind: source.kind,
        };
      } catch (err: any) {
        return {
          success: false,
          target: targetUrl!,
          kind: source.kind,
          error: err?.message || 'Failed to trigger OS default browser launch',
        };
      }
    }

    if (source.kind === 'api' || source.endpoint) {
      // For API providers in Phase 1, endpoint syntax validation
      return {
        success: true,
        target: source.endpoint || '',
        kind: source.kind,
      };
    }

    return {
      success: false,
      target: '',
      kind: source.kind,
      error: `Unsupported source kind in Phase 1: ${source.kind}`,
    };
  }
}
