export class IntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class IntegrationNotAvailableError extends IntegrationError {
  constructor(integrationId: string, details?: unknown) {
    super(
      'INTEGRATION_NOT_AVAILABLE',
      `Integration "${integrationId}" is not available or not installed on this system`,
      details
    );
  }
}

export class ActionUnsupportedError extends IntegrationError {
  constructor(integrationId: string, actionType: string) {
    super(
      'ACTION_UNSUPPORTED',
      `Action "${actionType}" is not supported by integration "${integrationId}"`
    );
  }
}

export class ActionExecutionError extends IntegrationError {
  constructor(actionType: string, message: string, details?: unknown) {
    super('ACTION_EXECUTION_FAILED', `Execution of "${actionType}" failed: ${message}`, details);
  }
}
