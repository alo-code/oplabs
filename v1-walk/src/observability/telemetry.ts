// telemetry.ts — minimal, dependency-free observability: structured logs + in-memory metrics.
//
// v1's founding reason to exist is that v0's failures can go *silent* (pain ⑤). So the platform
// ships its own signal surface, not a "metrics later" TODO. Kept dependency-free so it runs on a
// fresh clone with zero install friction, and so the redaction path is small enough to trust:
// logs go to stderr (never corrupting stdout data), and known secret shapes are stripped.

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? "info"] ?? LEVELS.info;

const SECRETY = /token|secret|key|authorization|password|bearer/i;

/** Defence-in-depth: a `Secret` already serializes to "[redacted]" via toJSON, but if a raw
 *  token slips into a secret-ish field as a plain string, strip it too. */
function redact(fields?: Record<string, unknown>): Record<string, unknown> {
  if (!fields) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = SECRETY.test(k) && typeof v === "string" ? "[redacted]" : v;
  }
  return out;
}

function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const line = { t: new Date().toISOString(), level, msg, ...redact(fields) };
  process.stderr.write(JSON.stringify(line) + "\n");
}

export const logger = {
  debug: (msg: string, f?: Record<string, unknown>) => emit("debug", msg, f),
  info: (msg: string, f?: Record<string, unknown>) => emit("info", msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => emit("warn", msg, f),
  error: (msg: string, f?: Record<string, unknown>) => emit("error", msg, f),
};

// --- Metrics -----------------------------------------------------------------
// A tiny counter/histogram registry. Not Prometheus — but the same shape (name + labels +
// value), so the production vision (the cadence's pino + OTel) is a drop-in, not a rewrite.

export type Labels = Record<string, string>;
export interface MetricSample {
  name: string;
  labels: Labels;
  count: number;
  sum: number;
}

function keyOf(name: string, labels: Labels): string {
  const l = Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(",");
  return l ? `${name}{${l}}` : name;
}

class Metrics {
  private readonly samples = new Map<string, MetricSample>();

  private bucket(name: string, labels: Labels): MetricSample {
    const key = keyOf(name, labels);
    let s = this.samples.get(key);
    if (!s) {
      s = { name, labels, count: 0, sum: 0 };
      this.samples.set(key, s);
    }
    return s;
  }

  /** A monotonic counter (e.g. connector_requests_total). */
  counter(name: string, labels: Labels = {}, by = 1): void {
    const s = this.bucket(name, labels);
    s.count += by;
    s.sum += by;
  }

  /** A distribution (e.g. connector_latency_ms). count = #observations, sum = total. */
  observe(name: string, value: number, labels: Labels = {}): void {
    const s = this.bucket(name, labels);
    s.count += 1;
    s.sum += value;
  }

  snapshot(): MetricSample[] {
    return [...this.samples.values()].map((s) => ({ ...s }));
  }

  reset(): void {
    this.samples.clear();
  }
}

export const metrics = new Metrics();

/** Wrap any connector call so requests / latency / errors are emitted uniformly — the framework
 *  provides observability so a new connector can't forget to. One failed auth and one runaway
 *  call are visible without per-connector code. */
export async function instrumented<T>(connector: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  metrics.counter("connector_requests_total", { connector });
  try {
    const result = await fn();
    metrics.observe("connector_latency_ms", performance.now() - start, { connector });
    return result;
  } catch (e) {
    metrics.counter("connector_errors_total", { connector });
    metrics.observe("connector_latency_ms", performance.now() - start, { connector });
    logger.error("connector.fetch_failed", { connector, err: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
