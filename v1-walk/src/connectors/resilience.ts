// resilience.ts — bounded retry + per-connector rate-limit around a connector's fetch (workplan C3.1).
//
// A misbehaving source should degrade, not crash a run. Every connector gets this for free via
// defineConnector: transient failures (network / HTTP 429 / 5xx) back off and retry up to N; terminal
// ones (4xx, malformed shape) fail fast; an optional min-interval throttles a rate-limited API. The
// layer emits connector_retries_total / connector_ratelimited_total so the behavior is observable.

import { performance } from "node:perf_hooks";
import { ZodError } from "zod";
import { HttpError } from "./http";
import { metrics, logger } from "../observability/telemetry";

export interface RetryPolicy {
  attempts?: number; // total tries (default 3)
  baseDelayMs?: number; // backoff base (default 250) — delay = base * 2^(attempt-1)
}
export interface RateLimitPolicy {
  minIntervalMs?: number; // minimum spacing between calls (default 0 = off)
}

export interface Limiter {
  lastCallAt: number;
}
export function makeLimiter(): Limiter {
  return { lastCallAt: 0 };
}

/** Transient → worth retrying: network/unknown errors and HTTP 429/5xx. Terminal → don't: 4xx, bad shape. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof ZodError) return false;
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  return true; // a thrown network error (fetch failed / ECONNRESET / viem RPC) is worth one more try
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withResilience<T>(
  connector: string,
  policy: { retry?: RetryPolicy; rateLimit?: RateLimitPolicy; state: Limiter; sleep?: (ms: number) => Promise<void> },
  fn: () => Promise<T>,
): Promise<T> {
  const sleep = policy.sleep ?? realSleep;
  const attempts = Math.max(1, policy.retry?.attempts ?? 3);
  const base = policy.retry?.baseDelayMs ?? 250;
  const minInterval = policy.rateLimit?.minIntervalMs ?? 0;

  // rate limit: enforce a minimum spacing between calls to this connector
  if (minInterval > 0) {
    const wait = policy.state.lastCallAt + minInterval - performance.now();
    if (wait > 0) {
      metrics.counter("connector_ratelimited_total", { connector });
      await sleep(wait);
    }
    policy.state.lastCallAt = performance.now();
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts && isRetryable(err)) {
        metrics.counter("connector_retries_total", { connector });
        logger.warn("connector.retry", { connector, attempt, err: err instanceof Error ? err.message : String(err) });
        await sleep(base * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
