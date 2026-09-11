import { VerificationReport, Workspace } from '../../shared/types';
import { WorkspaceValidator } from './workspace-validator';
import { LaunchResult } from './workspace-launcher';
import { PrivacyEnforcementResult } from '../privacy/privacy-manager';

export class WorkspaceVerifier {
  public verify(
    workspace: Workspace,
    launchResult: LaunchResult,
    overlayMounted: boolean,
    privacyResult: PrivacyEnforcementResult
  ): VerificationReport {
    const errors: string[] = [];

    const workspaceResolved = !!workspace && !!workspace.id;
    if (!workspaceResolved) {
      errors.push('Workspace configuration could not be resolved');
    }

    const sourceReachable = workspace.source.url
      ? WorkspaceValidator.isUrlReachableSyntax(workspace.source.url)
      : !!workspace.source.endpoint;

    if (!sourceReachable) {
      errors.push(`Configured source URL/endpoint is invalid or unreachable: ${workspace.source.url || workspace.source.endpoint}`);
    }

    const sourceLaunched = launchResult.success;
    if (!sourceLaunched) {
      errors.push(launchResult.error || 'Failed to dispatch source launch');
    }

    if (!overlayMounted) {
      errors.push('Overlay runtime HUD window could not be mounted or verified');
    }

    const passed = workspaceResolved && sourceReachable && sourceLaunched && overlayMounted && errors.length === 0;

    return {
      passed,
      workspaceResolved,
      sourceReachable,
      sourceLaunched,
      overlayMounted,
      privacyPolicyApplied: privacyResult.applied,
      privacyNotice: privacyResult.notice,
      errors,
    };
  }
}
