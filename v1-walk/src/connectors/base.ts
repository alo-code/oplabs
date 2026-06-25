// base.ts — the connector contract: the one seam every source conforms to.
//
// v0 (n8n) gave each source its own credential + node. That's fine for one workflow; it's the
// brief's "auth is per-source and manual" pain the moment there's a second. v1 makes a connector
// a *uniform* thing: declare your input/output as zod schemas, implement `fetch`, and the
// framework supplies validation, a standard healthcheck, central (redacted) credentials, and
// uniform telemetry for free. A new source becomes "implement fetch + declare schema" — hours,
// not days. The schemas are public on the connector so the registry, the control plane, and a
// Q&A agent can introspect what a source takes and returns without reading its code.

import type { z } from "zod";
import { instrumented } from "../observability/telemetry";

/** A point-in-time liveness signal for a source — surfaced in the control plane so a
 *  misconfigured credential is *loud*, not silent (attacks pain ⑤: no observability). */
export interface HealthStatus {
  connector: string;
  ok: boolean;
  detail?: string;
  checkedAt: string; // ISO-8601
}

/** The uniform seam every connector satisfies. `TParams`/`TResult` are pinned as zod schemas
 *  so anything downstream can introspect and trust the shape. */
export interface Connector<TParams = unknown, TResult = unknown> {
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly paramsSchema: z.ZodType<TParams>;
  readonly resultSchema: z.ZodType<TResult>;
  healthcheck(): Promise<HealthStatus>;
  fetch(params: TParams): Promise<TResult>;
}

/** What a connector author writes. Everything cross-cutting (parse-in, parse-out, the health
 *  envelope) is added by `defineConnector`, so an author can't forget it and it can't drift
 *  between sources. */
export interface ConnectorDef<TParams, TResult> {
  name: string;
  capabilities?: readonly string[];
  paramsSchema: z.ZodType<TParams>;
  resultSchema: z.ZodType<TResult>;
  fetch: (params: TParams) => Promise<TResult>;
  /** Optional cheap liveness probe (e.g. an authenticated no-op). Defaults to ok=true. */
  healthcheck?: () => Promise<{ ok: boolean; detail?: string }>;
}

/** Wrap a connector definition into the uniform contract:
 *  - parse params *in*  → "parse, don't trust": a wrong-shaped call is rejected at the seam;
 *  - parse result *out* → callers (the model, an agent) can rely on the declared type;
 *  - a standard health envelope, with thrown probes downgraded to ok=false (never a crash). */
export function defineConnector<TParams, TResult>(
  def: ConnectorDef<TParams, TResult>,
): Connector<TParams, TResult> {
  return {
    name: def.name,
    capabilities: def.capabilities ?? [],
    paramsSchema: def.paramsSchema,
    resultSchema: def.resultSchema,
    async fetch(params: TParams): Promise<TResult> {
      // Uniform telemetry by construction: every connector emits requests/latency/errors with no
      // per-connector code. parse-in and parse-out happen inside the instrumented span.
      return instrumented(def.name, async () => {
        const parsed = def.paramsSchema.parse(params);
        const result = await def.fetch(parsed);
        return def.resultSchema.parse(result);
      });
    },
    async healthcheck(): Promise<HealthStatus> {
      const checkedAt = new Date().toISOString();
      try {
        const h = def.healthcheck ? await def.healthcheck() : { ok: true };
        return { connector: def.name, ok: h.ok, detail: h.detail, checkedAt };
      } catch (e) {
        return { connector: def.name, ok: false, detail: errMsg(e), checkedAt };
      }
    },
  };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
