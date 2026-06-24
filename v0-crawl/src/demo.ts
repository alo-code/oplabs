/**
 * Beacon — trust-gate demo.
 *
 * Runs the SAME logic the n8n Code node runs (src/trust/, unit-tested 5/5) on one
 * good brief and two bad ones, to show the guardrail live: an ungrounded or
 * speculative brief is never delivered. No API keys, no n8n — runs on a fresh clone:
 *
 *   cd v0-crawl && npm install && npm run demo
 */
import { parseActivity, parseBrief, type Brief } from "./trust/schema";
import { checkGrounding } from "./trust/grounding";
import { scoreBrief } from "./trust/evals";

// The real, linked activity n8n would have fetched this week (GitHub + Monday).
const activity = parseActivity({
  from: "2026-06-16T00:00:00Z",
  to: "2026-06-23T00:00:00Z",
  artifacts: [
    { kind: "pr", source: "github", id: "#4120", url: "https://github.com/ethereum-optimism/optimism/pull/4120", label: "feat: span batch validation" },
    { kind: "commit", source: "github", id: "a1b2c3d4e5f6", url: "https://github.com/ethereum-optimism/optimism/commit/a1b2c3d4e5f6", label: "fix: batcher retry backoff" },
    { kind: "issue", source: "monday", id: "MON-1187", url: "https://acme.monday.com/boards/1/pulses/1187", label: "Ship Coinbase onboarding flow" },
  ],
});

const good: Brief = parseBrief({
  title: "Weekly shipped brief",
  window: { from: activity.from, to: activity.to },
  sections: [{ heading: "Shipped", bullets: [
    { text: "Span-batch validation landed in the derivation pipeline.", whyItMatters: "Fewer reorg surprises for the chains we host.", citations: ["#4120"] },
    { text: "Batcher retry backoff fixed.", whyItMatters: "Customer chains post to L1 more reliably.", citations: ["a1b2c3d"] },
    { text: "Coinbase onboarding flow completed.", whyItMatters: "Unblocks the Coinbase rollout for the deal team.", citations: ["MON-1187"] },
  ]}],
});

const ungrounded: Brief = parseBrief({
  title: "Weekly shipped brief",
  window: { from: activity.from, to: activity.to },
  sections: [{ heading: "Shipped", bullets: [
    { text: "Span-batch validation landed in the derivation pipeline, tightening how batches from L1 are accepted.", citations: ["#4120"] },
    { text: "Batcher retry backoff was fixed so transient L1 submission failures no longer stall the submitter.", citations: ["a1b2c3d"] },
    { text: "We launched a brand-new decentralized sequencer across every production chain this week.", citations: ["#9999"] }, // no such PR
  ]}],
});

const speculative: Brief = parseBrief({
  title: "Weekly shipped brief",
  window: { from: activity.from, to: activity.to },
  sections: [{ heading: "Shipped", bullets: [
    { text: "Span-batch validation landed in the derivation pipeline, tightening batch acceptance from L1.", whyItMatters: "Cuts customer proving costs by 40% versus last quarter.", citations: ["#4120"] }, // 40% is invented
    { text: "Batcher retry backoff was fixed, improving submission reliability for customer chains.", whyItMatters: "Fewer stalled submissions for the chains we host.", citations: ["a1b2c3d"] },
  ]}],
});

function show(label: string, brief: Brief): void {
  const g = checkGrounding(brief, activity);
  const e = scoreBrief(brief, activity);
  console.log("\n" + label);
  console.log(e.pass ? "   PUBLISHED  ->  #eng-updates + #gtm-shipped" : "   HELD       ->  not sent; reason posted to #beacon-ops");
  console.log("   eval " + e.score + "  |  grounded " + Math.round(g.groundedRatio * 100) + "%  |  " + e.checks.words + " words");
  if (!e.pass) console.log("   why held:  " + e.notes.join("; "));
}

console.log("Beacon — trust gate (same logic the n8n Code node runs; src/trust/, tested 5/5)");
console.log("=".repeat(72));
show("1) A real, fully-grounded brief", good);
show("2) A brief citing a PR that does not exist (#9999)", ungrounded);
show("3) A grounded brief whose BD line invents a metric ('40%')", speculative);
console.log("\n" + "=".repeat(72));
console.log("Deterministic: an ungrounded or speculative brief is never delivered to a stakeholder.");
