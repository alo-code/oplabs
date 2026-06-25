// run.ts — the one action the control plane exposes: "run a connector now, store the result."
//
// Extracted from the HTTP layer so it's unit-testable offline. A run = fetch via a registered
// connector → validate it's a real Activity → write-through to shared memory → return a summary a
// non-engineer can read (counts + latency + ok/err). Errors become a summary, never a thrown crash.

import { performance } from "node:perf_hooks";
import { Activity } from "../connectors/artifact";
import type { ConnectorRegistry } from "../connectors/registry";
import type { MemoryStore } from "../memory/store";
import { writeThrough } from "../memory/write-through";

export interface RunSummary {
  connector: string;
  ok: boolean;
  fetched: number;
  stored: number;
  deduped: number;
  latencyMs: number;
  at: string; // ISO
  error?: string;
}

export async function executeRun(
  registry: ConnectorRegistry,
  store: MemoryStore,
  connectorName: string,
  params: unknown,
  key = "control-plane",
): Promise<RunSummary> {
  const at = new Date().toISOString();
  const start = performance.now();
  const base = { connector: connectorName, fetched: 0, stored: 0, deduped: 0, at };

  const connector = registry.get(connectorName);
  if (!connector) {
    return { ...base, ok: false, latencyMs: 0, error: `unknown connector "${connectorName}"` };
  }
  try {
    const activity = Activity.parse(await connector.fetch(params));
    const w = await writeThrough(store, "control-plane", key, activity);
    return { ...base, ok: true, fetched: w.total, stored: w.stored, deduped: w.deduped, latencyMs: Math.round(performance.now() - start) };
  } catch (e) {
    return { ...base, ok: false, latencyMs: Math.round(performance.now() - start), error: e instanceof Error ? e.message : String(e) };
  }
}
