export type CapabilityType =
  | 'OPEN'
  | 'FOCUS'
  | 'OPEN_FILE'
  | 'OPEN_FOLDER'
  | 'GET_STATUS'
  | 'GET_CURRENT_BRANCH'
  | 'GET_DIFF';

export interface IntegrationCapability {
  name: CapabilityType;
  description: string;
}

export interface IntegrationAction {
  type: string;
  parameters: Record<string, any>;
}

export interface IntegrationExecutionContext {
  workspaceId: string;
  workingDirectory?: string;
  activeApplication?: string;
  variables: Record<string, unknown>;
}

export interface IntegrationResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DesktopIntegration {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  isAvailable(): Promise<boolean>;

  getCapabilities(): IntegrationCapability[];

  execute(
    action: IntegrationAction,
    context: IntegrationExecutionContext
  ): Promise<IntegrationResult>;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  available: boolean;
  capabilities: string[];
}
