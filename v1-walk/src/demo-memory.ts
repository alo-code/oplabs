/**
 * Beacon v1 (walk) — shared memory, end to end. Zero keys by default (in-memory store), or against
 * real Postgres+pgvector when DATABASE_URL is set:
 *
 *   cd v1-walk && npm install && npm run memory          # in-memory, zero keys
 *   npm run db:up && export DATABASE_URL=postgres://beacon:beacon@localhost:5432/beacon && npm run memory
 *
 * Shows the pain-④ fix concretely: agent "exec-brief" writes real GitHub activity into shared
 * memory; agent "qa-probe" reads it back by semantic recall — one agent using another's context.
 */
import { makeGitHubConnector } from "./connectors/github";
import { InMemoryStore } from "./memory/inmemory";
import { PostgresStore } from "./memory/postgres";
import { writeThrough } from "./memory/write-through";
import { metrics } from "./observability/telemetry";
import type { MemoryStore } from "./memory/store";
import { loadEnv } from "./core/env";

loadEnv();

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const store: MemoryStore = url ? new PostgresStore({ connectionString: url }) : new InMemoryStore();
  const backend = url ? "postgres + pgvector" : "in-memory";
  console.log(`Beacon v1 — shared memory (${backend})\n`);

  // Agent A ("exec-brief") fetches real activity once and writes it through to shared memory.
  const github = makeGitHubConnector();
  const repo = process.env.GITHUB_REPOS?.split(",")[0]?.trim() || "ethereum-optimism/optimism";
  const key = "exec-brief:this-week";
  const activity = await github.fetch({ repo, days: 7 });
  const w1 = await writeThrough(store, "exec-brief", key, activity);
  console.log(`agent "exec-brief" wrote ${w1.stored} items from ${repo} (${w1.deduped} dedup)`);
  const w2 = await writeThrough(store, "exec-brief", key, activity);
  console.log(`  re-run is idempotent: ${w2.stored} stored, ${w2.deduped} dedup\n`);

  // Agent B ("qa-probe") reads agent A's memory — cross-agent context, no re-fetch. The pain-④ fix.
  console.log(`agent "qa-probe" asks shared memory: "fault proofs / withdrawal bridge?"`);
  const hits = await store.semanticRecall("fault proofs and the withdrawal bridge", 3, { key });
  for (const h of hits) {
    const label = (h.payload as { label?: string }).label ?? h.sourceId;
    console.log(`  ${h.score.toFixed(3)}  [written by ${h.agent}]  ${label}`);
  }

  const recent = await store.recall({ key, limit: 3 });
  console.log(`\nrecall({ key }) → ${recent.length} most-recent items:`);
  for (const r of recent) console.log(`  - ${(r.payload as { label?: string }).label ?? r.sourceId}`);

  console.log("\nmetrics:");
  for (const s of metrics.snapshot()) {
    const labels = Object.entries(s.labels).map(([k, v]) => `${k}=${v}`).join(",");
    console.log(`  ${s.name}{${labels}} count=${s.count}`);
  }

  console.log(
    `\n→ agent B read agent A's items from one shared store. In-memory shares within a process; ` +
      `Postgres makes it durable and cross-host.`,
  );
  await store.close();
}

main().catch((e) => {
  console.error("memory demo failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
