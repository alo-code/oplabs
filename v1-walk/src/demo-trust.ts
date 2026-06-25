/**
 * Beacon v1 — the trust gate, on a good brief and three bad ones (no keys, no network).
 *
 *   cd v1-walk && npm run trust
 *
 * The exec summary must EARN publication: ungrounded, fabricated-figure, or secret-leaking briefs are
 * HELD — even when the numeric score clears the floor. Same gate as v0, now over multi-source memory.
 */
import { gateReport } from "./trust/gate";
import type { Report } from "./agents/exec-summary/summary";

const valid = new Set(["sha-1", "https://gh/1", "sha-2", "https://gh/2"]);

function report(over: Partial<Report> = {}): Report {
  return {
    title: "OP Labs — Activity Brief",
    window: "as of 2026-06-25",
    generatedAt: "2026-06-25T00:00:00Z",
    engine: "local",
    stats: { sources: 1, items: 1 },
    sections: [
      { heading: "🚢 Shipped", bullets: [{ text: "feat: add FeeVault withdrawal route setter (#20982)", source: "github", kind: "commit", id: "sha-1", url: "https://gh/1" }], more: 0 },
    ],
    ...over,
  };
}

console.log("\nBeacon — trust gate (the exec summary must earn publication)\n");

function show(name: string, r: Report): void {
  const v = gateReport(r, valid);
  const tag = v.published ? "PUBLISHED" : "HELD     ";
  console.log(`  ${tag}  ${name}`);
  console.log(`            eval ${v.score} (floor ${v.floor})` + (v.published ? "" : `  ✗ ${v.heldReason}`));
}

show("a grounded brief", report());
show("narrative invents '40% faster' (uncited)", report({ engine: "claude", narrative: "This week shipped fault proofs, making withdrawals 40% faster." }));
show("a bullet cites a non-existent artifact", report({ sections: [{ heading: "Shipped", bullets: [{ text: "ghost change", source: "github", kind: "commit", id: "sha-FAKE", url: "https://gh/fake" }], more: 0 }] }));
show("a bullet leaks an API key", report({ sections: [{ heading: "Shipped", bullets: [{ text: "oops committed sk-ant-abcdefghijklmnop12345", source: "github", kind: "commit", id: "sha-1", url: "https://gh/1" }], more: 0 }] }));

console.log("\n→ ungrounded / fabricated / leaked → HELD, even if the score clears the floor.");
console.log("  The control plane shows this verdict on every Create Report; a held brief is never published.\n");
