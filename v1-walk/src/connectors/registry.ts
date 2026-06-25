// registry.ts — the single answer to "what can Beacon read, and is it healthy right now?"
//
// In v0 that knowledge lived scattered across n8n's credential editor. Here it's one object the
// control plane and a Q&A agent both read: every registered connector, its declared schemas
// (introspectable), and its *live* health. This is what makes the platform discoverable instead
// of tribal knowledge.

import type { Connector, HealthStatus } from "./base";

export interface RegistryEntry {
  name: string;
  capabilities: readonly string[];
  health: HealthStatus;
}

export class ConnectorRegistry {
  private readonly connectors = new Map<string, Connector>();

  /** Register a connector. Duplicate names throw — two sources answering to one name is a bug,
   *  not something to silently last-write-wins. */
  register(connector: Connector): this {
    if (this.connectors.has(connector.name)) {
      throw new Error(`connector "${connector.name}" already registered`);
    }
    this.connectors.set(connector.name, connector);
    return this;
  }

  get(name: string): Connector | undefined {
    return this.connectors.get(name);
  }

  names(): string[] {
    return [...this.connectors.keys()];
  }

  /** The control-plane / discovery view: every connector + its live health, probed in parallel. */
  async list(): Promise<RegistryEntry[]> {
    return Promise.all(
      [...this.connectors.values()].map(async (c) => ({
        name: c.name,
        capabilities: c.capabilities,
        health: await c.healthcheck(),
      })),
    );
  }
}
