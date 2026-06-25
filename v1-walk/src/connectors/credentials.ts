// credentials.ts — the one audited place that resolves every connector's secret.
//
// v0's "auth is per-source and manual" pain (③) is really two problems: secrets scattered across
// per-workflow config, and no single place to rotate/scope/audit them. v1 fixes both: no
// connector reads process.env directly — they ask the registry, which returns a `Secret` that
// *refuses to serialize itself*. So a token cannot leak into a log line, an error, or JSON output,
// and there is exactly one spot to rotate or revoke.

import { logger, metrics } from "../observability/telemetry";

/** A secret that won't print itself. The only way to read it is `.reveal()`, called right at the
 *  HTTP boundary. Every other path (logging, JSON.stringify, util.inspect, string coercion) gets
 *  "[redacted]". */
export class Secret {
  readonly #value: string;
  constructor(value: string) {
    this.#value = value;
  }
  reveal(): string {
    return this.#value;
  }
  toString(): string {
    return "[redacted]";
  }
  toJSON(): string {
    return "[redacted]";
  }
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return "[redacted]";
  }
}

export interface CredentialSpec {
  connector: string;
  envVar: string;
  /** false = the source works without it (e.g. GitHub *public* repos, public OP RPC). */
  required: boolean;
}

export interface CredentialHandle {
  connector: string;
  present: boolean;
  secret?: Secret;
}

/** Resolves credentials from an env source (default `process.env`). Injectable so tests never
 *  touch the real environment. */
export class CredentialRegistry {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  resolve(spec: CredentialSpec): CredentialHandle {
    const raw = (this.env[spec.envVar] ?? "").trim();
    const present = raw.length > 0;
    metrics.counter("credential_resolutions_total", {
      connector: spec.connector,
      result: present ? "present" : "absent",
    });
    if (!present && spec.required) {
      // Loud, not silent: a misconfigured source announces itself instead of failing mid-run.
      logger.warn("credential.missing", { connector: spec.connector, envVar: spec.envVar });
    }
    return { connector: spec.connector, present, secret: present ? new Secret(raw) : undefined };
  }
}

export const credentials = new CredentialRegistry();
