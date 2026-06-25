/**
 * Beacon v1 (walk) — the control plane. A tiny, dependency-free HTTP surface a NON-ENGINEER can use
 * (pain ⑥): see what Beacon can read + whether it's healthy, trigger a run, and read the output and
 * run history — across all sources, not buried in the n8n editor.
 *
 *   cd v1-walk && npm install && npm run control-plane     # → http://localhost:7878 (zero keys)
 *   DATABASE_URL=postgres://beacon:beacon@localhost:5432/beacon npm run control-plane   # shared memory
 */
import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { defaultRegistry } from "../connectors/registry-default";
import { fixtureRegistry } from "../connectors/fixtures";
import { InMemoryStore } from "../memory/inmemory";
import { PostgresStore } from "../memory/postgres";
import type { MemoryStore } from "../memory/store";
import { metrics, logger } from "../observability/telemetry";
import { executeRun, type RunSummary } from "./run";
import { pickSummarizer, type Report } from "../agents/exec-summary/summary";
import { loadEnv, upsertEnv } from "../core/env";
import { serviceBySource, envVarsFor } from "../core/services";
import { PAGE } from "./page";

loadEnv(); // populate process.env from a local .env before anything reads credentials

const PORT = Number(process.env.PORT ?? 7878);
const ENV_FILE = ".env";

const fixtures = !!process.env.BEACON_FIXTURES; // demo mode: Slack/Notion/Monday replay fixtures
const registry = fixtures ? fixtureRegistry() : defaultRegistry();
const store: MemoryStore = process.env.DATABASE_URL
  ? new PostgresStore({ connectionString: process.env.DATABASE_URL })
  : new InMemoryStore();
const backend = process.env.DATABASE_URL ? "postgres+pgvector" : "in-memory";

// Run history persists to a small file so it survives a server restart (e.g. `./beacon up`),
// instead of resetting to empty while durable memory still shows data.
const RUNS_FILE = "control-plane-runs.json";
function loadRuns(): RunSummary[] {
  try {
    return JSON.parse(readFileSync(RUNS_FILE, "utf8")) as RunSummary[];
  } catch {
    return [];
  }
}
function saveRuns(): void {
  try {
    writeFileSync(RUNS_FILE, JSON.stringify(runs.slice(0, 50)));
  } catch {
    /* best-effort */
  }
}
const runs: RunSummary[] = loadRuns();

// The last executive summary persists too, so it survives a restart and shows on page load.
const REPORT_FILE = "control-plane-report.json";
function loadReport(): Report | null {
  try {
    return JSON.parse(readFileSync(REPORT_FILE, "utf8")) as Report;
  } catch {
    return null;
  }
}
function saveReport(): void {
  try {
    writeFileSync(REPORT_FILE, JSON.stringify(lastReport));
  } catch {
    /* best-effort */
  }
}
let lastReport: Report | null = loadReport();

/** Sensible default fetch params per source, used by "Create Report" (run everything). */
function defaultParams(name: string): unknown {
  if (name === "github") return { repo: process.env.GITHUB_REPOS?.split(",")[0]?.trim() || "ethereum-optimism/optimism", days: 7 };
  if (name === "onchain") return { blocks: 3 };
  return {}; // slack/notion/monday self-configure their target from env
}

function json(res: http.ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(PAGE);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/connectors") {
      return json(res, 200, { backend, fixtures, connectors: await registry.list() });
    }
    if (req.method === "GET" && url.pathname === "/api/memory") {
      const limit = Number(url.searchParams.get("limit") ?? 20);
      return json(res, 200, await store.recall({ limit }));
    }
    if (req.method === "GET" && url.pathname === "/api/runs") {
      return json(res, 200, runs.slice(0, 10));
    }
    if (req.method === "GET" && url.pathname === "/api/metrics") {
      return json(res, 200, metrics.snapshot());
    }
    if (req.method === "GET" && url.pathname === "/api/report") {
      return json(res, 200, lastReport);
    }
    // Authenticate a service locally: paste a token, persist to .env, live-update process.env, re-probe.
    if (req.method === "POST" && url.pathname === "/api/connect") {
      const body = JSON.parse((await readBody(req)) || "{}") as { source?: string; token?: string; target?: string };
      const spec = body.source ? serviceBySource(body.source) : undefined;
      if (!spec) return json(res, 400, { ok: false, error: "unknown service" });
      const vars = envVarsFor(spec, body.token ?? "", body.target);
      for (const [k, v] of Object.entries(vars)) process.env[k] = v;
      if (Object.keys(vars).length) upsertEnv(ENV_FILE, vars);
      const connector = registry.get(spec.source);
      const health = connector ? await connector.healthcheck() : { connector: spec.source, ok: true, detail: "saved" };
      logger.info("control_plane.connect", { source: spec.source, set: Object.keys(vars) }); // keys only, never values
      return json(res, 200, { ok: health.ok, source: spec.source, health });
    }
    // Create Report, step 1: fetch every HEALTHY source into shared memory.
    if (req.method === "POST" && url.pathname === "/api/run-all") {
      const summaries: RunSummary[] = [];
      for (const entry of await registry.list()) {
        if (!entry.health.ok) continue; // skip sources that need credentials
        const summary = await executeRun(registry, store, entry.name, defaultParams(entry.name), "report");
        runs.unshift(summary);
        summaries.push(summary);
      }
      runs.splice(50);
      saveRuns();
      logger.info("control_plane.run_all", { sources: summaries.length });
      return json(res, 200, summaries);
    }
    // Create Report, step 2: synthesize the grounded executive summary from shared memory.
    if (req.method === "POST" && url.pathname === "/api/report") {
      const items = await store.recall({ limit: 80 });
      lastReport = await pickSummarizer().summarize(items, new Date().toISOString());
      saveReport();
      logger.info("control_plane.report", { engine: lastReport.engine, items: lastReport.stats.items });
      return json(res, 200, lastReport);
    }
    if (req.method === "POST" && url.pathname === "/api/run") {
      const { connector, params } = JSON.parse((await readBody(req)) || "{}");
      const summary = await executeRun(registry, store, connector, params ?? {});
      runs.unshift(summary);
      runs.splice(50); // keep the last 50
      saveRuns();
      logger.info("control_plane.run", { connector: summary.connector, ok: summary.ok, stored: summary.stored });
      return json(res, summary.ok ? 200 : 400, summary);
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  // bound to localhost only — the control plane can write credentials to a local .env
  console.log(`Beacon control plane → http://localhost:${PORT}  (memory: ${backend}${fixtures ? " · DEMO data" : ""})`);
  console.log("A non-engineer can see connectors + health, connect a service, run a report here.");
});
