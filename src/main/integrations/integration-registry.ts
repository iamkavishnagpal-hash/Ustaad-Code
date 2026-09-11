import { DesktopIntegration, IntegrationStatus } from './integration-types';

export class IntegrationRegistry {
  private integrations: Map<string, DesktopIntegration> = new Map();

  public register(integration: DesktopIntegration): void {
    this.integrations.set(integration.id, integration);
  }

  public get(id: string): DesktopIntegration | undefined {
    return this.integrations.get(id);
  }

  public list(): DesktopIntegration[] {
    return Array.from(this.integrations.values());
  }

  public async getStatuses(): Promise<IntegrationStatus[]> {
    const statuses: IntegrationStatus[] = [];
    for (const integration of this.integrations.values()) {
      let available = false;
      try {
        available = await integration.isAvailable();
      } catch {
        available = false;
      }
      statuses.push({
        id: integration.id,
        name: integration.name,
        available,
        capabilities: integration.getCapabilities().map((c) => c.name),
      });
    }
    return statuses;
  }
}
