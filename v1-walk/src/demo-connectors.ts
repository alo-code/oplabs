/**
 * Beacon v1 (walk) — the connector library, end to end, with REAL calls and ZERO keys for the two
 * sources that don't need them.
 *
 *   cd v1-walk && npm install && npm run connectors
 *
 * Lists all registered connectors with live health (GitHub + onchain are live; Slack / Notion /
 * Monday show "needs credentials" until a token is set — same interface, no bespoke code), does a
 * real fetch from the two zero-key sources, and prints the telemetry the framework emitted for free.
 */
import { defaultRegistry } from "./connectors/registry-default";
import { Activity } from "./connectors/artifact";
import { metrics } from "./observability/telemetry";
import { loadEnv } from "./core/env";

loadEnv();

async function main(): Promise<void> {
  const registry = defaultRegistry();

  console.log("Beacon v1 — connector library (real calls, zero keys)\n");

  // 1) Discovery + live health across ALL sources.
  console.log("registry.list() — discovery + live health:");
  for (const e of await registry.list()) {
    const status = e.health.ok ? "OK  " : "····";
    console.log(`  ${status} ${e.name.padEnd(8)} [${e.capabilities.join(", ")}] — ${e.health.detail ?? ""}`);
  }

  // 2) A real fetch from each zero-key source.
  const repo = process.env.GITHUB_REPOS?.split(",")[0]?.trim() || "ethereum-optimism/optimism";
  const gh = Activity.parse(await registry.get("github")!.fetch({ repo, days: 7 }));
  console.log(`\ngithub.fetch({ repo: "${repo}", days: 7 }) → ${gh.artifacts.length} artifacts`);
  for (const a of gh.artifacts.slice(0, 3)) console.log(`  - ${a.id.slice(0, 9)}  ${a.label}`);

  const oc = Activity.parse(await registry.get("onchain")!.fetch({ blocks: 2 }));
  console.log(`\nonchain.fetch({ blocks: 2 }) → ${oc.artifacts.length} artifacts`);
  for (const a of oc.artifacts) console.log(`  - ${a.label}`);

  // 3) The telemetry the framework emitted — no per-connector code wrote any of it.
  console.log("\nmetrics snapshot (uniform, by construction):");
  for (const s of metrics.snapshot()) {
    const labels = Object.entries(s.labels).map(([k, v]) => `${k}=${v}`).join(",");
    const avg = s.name.endsWith("_ms") ? ` avg=${(s.sum / s.count).toFixed(0)}ms` : "";
    console.log(`  ${s.name}{${labels}} count=${s.count}${avg}`);
  }

  console.log("\n→ Slack / Notion / Monday are wired the same way — add a token and they go live, no new plumbing.");
}

main().catch((e) => {
  console.error("demo failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
