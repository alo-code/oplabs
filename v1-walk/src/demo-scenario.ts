/**
 * Beacon v1 (walk) — the multi-source runthrough for the demo.
 *
 *   cd v1-walk && npm run scenario              # in-memory
 *   DATABASE_URL=…  npm run scenario            # writes to Postgres (visible in the control plane)
 *
 * Narrates three events — a Slack message, a Monday deal change, a Notion page update — being
 * ingested into ONE shared memory, alongside the always-real GitHub + onchain sources, then asks a
 * single question across all of them. Slack/Notion/Monday are DEMO/fixture data (no tokens needed),
 * replayed through the real connector + memory pipeline; GitHub + onchain are live.
 */
import { fixtureRegistry } from "./connectors/fixtures";
import { Activity } from "./connectors/artifact";
import { ConnectorRegistry } from "./connectors/registry";
import { writeThrough } from "./memory/write-through";
import { InMemoryStore } from "./memory/inmemory";
import { PostgresStore } from "./memory/postgres";
import type { MemoryStore } from "./memory/store";
import { loadEnv } from "./core/env";

loadEnv();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, process.env.SCENARIO_FAST ? 0 : ms));

async function ingest(store: MemoryStore, reg: ConnectorRegistry, name: string, params: unknown, key: string) {
  const activity = Activity.parse(await reg.get(name)!.fetch(params));
  const w = await writeThrough(store, name, key, activity);
  return { activity, w };
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const store: MemoryStore = url ? new PostgresStore({ connectionString: url }) : new InMemoryStore();
  const reg = fixtureRegistry();
  const key = "weekly-activity";

  console.log("Beacon — multi-source runthrough");
  console.log("(Slack/Notion/Monday = demo data, replayed through the real pipeline · GitHub/onchain = live)\n");
  console.log("backend:", url ? "postgres+pgvector" : "in-memory", "\n");
  await sleep(400);

  console.log("①  📨  Slack — a teammate posts in #gtm-shipped …");
  await sleep(800);
  let r = await ingest(store, reg, "slack", { channel: process.env.SLACK_CHANNEL }, key);
  console.log("      → " + (r.activity.artifacts[0]?.label ?? ""));
  console.log("      Beacon ingested " + r.w.stored + " Slack message(s).\n");
  await sleep(600);

  console.log("②  📋  Monday — the Acme deal moves to 'Won' on the GTM Pipeline board …");
  await sleep(800);
  r = await ingest(store, reg, "monday", {}, key);
  r.activity.artifacts.forEach((a) => console.log("      → " + a.label));
  console.log("      Beacon ingested " + r.w.stored + " Monday item(s).\n");
  await sleep(600);

  console.log("③  📝  Notion — the 'Upgrade 19 — Launch Notes' page is updated …");
  await sleep(800);
  r = await ingest(store, reg, "notion", {}, key);
  console.log("      → " + (r.activity.artifacts[0]?.label ?? ""));
  console.log("      Beacon ingested " + r.w.stored + " Notion page(s).\n");
  await sleep(600);

  console.log("…and the always-real sources (live, zero keys):");
  const gh = await ingest(store, reg, "github", { repo: "ethereum-optimism/optimism", days: 7 }, key);
  console.log("      GitHub  → " + gh.w.stored + " commits");
  const oc = await ingest(store, reg, "onchain", { blocks: 1 }, key);
  console.log("      onchain → " + oc.w.stored + " OP Mainnet block\n");
  await sleep(600);

  console.log("Re-running every source (nothing new happened) …");
  const a = await ingest(store, reg, "slack", { channel: process.env.SLACK_CHANNEL }, key);
  const b = await ingest(store, reg, "monday", {}, key);
  const c = await ingest(store, reg, "notion", {}, key);
  const dedup = a.w.deduped + b.w.deduped + c.w.deduped;
  console.log("      → 0 new, " + dedup + " dedup — Beacon doesn't re-fetch what it's already seen (pain ①).\n");
  await sleep(600);

  console.log('Now ask shared memory ACROSS all sources: "what shipped and what deal news this week?"');
  await sleep(500);
  const hits = await store.semanticRecall("shipped upgrade fault proofs Acme deal won launch customer", 6, { key });
  for (const h of hits) {
    const label = (h.payload as { label?: string }).label ?? h.sourceId;
    console.log("   " + h.score.toFixed(3) + "  [" + h.source + "]  " + label);
  }
  console.log("\n→ one grounded, shared source of truth across Slack · Monday · Notion · GitHub · onchain.");
  if (url) console.log("   (written to Postgres — open the control plane to see it: ./beacon up)");
  await store.close();
}

main().catch((e) => {
  console.error("scenario failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
