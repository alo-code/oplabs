// trust.eval-set.test.ts — the labeled eval set: the gate's decisions, pinned and
// regression-tested in CI (npm test). Each case is a brief + the verdict we expect and,
// for the held ones, which hard gate should catch it. This is how we keep "what's safe to
// publish" from drifting as the prompt or sources change.

import { describe, it, expect } from "vitest";
import { parseActivity, parseBrief, type Activity, type Brief } from "../src/trust/schema";
import { scoreBrief } from "../src/trust/evals";

const activity: Activity = parseActivity({
  from: "2026-06-16T00:00:00Z",
  to: "2026-06-23T00:00:00Z",
  artifacts: [
    { kind: "pr", source: "github", id: "#4120", url: "https://github.com/ethereum-optimism/optimism/pull/4120", label: "feat: span batch validation" },
    { kind: "commit", source: "github", id: "a1b2c3d4e5f6", url: "https://github.com/ethereum-optimism/optimism/commit/a1b2c3d4e5f6", label: "fix: batcher retry backoff" },
    { kind: "onchain", source: "optimism", id: "op-block-153361916", url: "https://optimistic.etherscan.io/block/153361916", label: "OP Mainnet block 153361916" },
  ],
});

const window = { from: activity.from, to: activity.to };
const mk = (bullets: unknown[]): Brief => parseBrief({ title: "Weekly shipped brief", window, sections: [{ heading: "Shipped", bullets }] });

type CheckName = "grounded" | "noSpeculativeImpact" | "noLeakedSecrets";
const cases: Array<{ name: string; brief: Brief; expectPass: boolean; failed?: CheckName }> = [
  {
    name: "grounded, well-formed, safe (incl. an onchain citation) → PUBLISH",
    expectPass: true,
    brief: mk([
      { text: "Span-batch validation landed in the derivation pipeline, tightening batch acceptance from L1.", whyItMatters: "Fewer reorg surprises for the chains we host.", citations: ["#4120"] },
      { text: "Batcher retry backoff was fixed so transient L1 submission failures no longer stall the submitter.", whyItMatters: "More reliable posting for customer chains.", citations: ["a1b2c3d"] },
      { text: "OP Mainnet kept finalizing blocks on schedule with live transaction volume all week.", citations: ["https://optimistic.etherscan.io/block/153361916"] },
    ]),
  },
  {
    name: "cites a PR that doesn't exist → HELD (grounding)",
    expectPass: false, failed: "grounded",
    brief: mk([
      { text: "Span-batch validation landed in the derivation pipeline, accepting batches from L1 inputs.", citations: ["#4120"] },
      { text: "We launched a brand-new decentralized sequencer across every production chain this week.", citations: ["#9999"] },
    ]),
  },
  {
    name: "invents a metric in a BD line → HELD (speculative)",
    expectPass: false, failed: "noSpeculativeImpact",
    brief: mk([
      { text: "Span-batch validation landed in the derivation pipeline, tightening batch acceptance from L1.", whyItMatters: "Cuts customer proving costs by 40% versus last quarter.", citations: ["#4120"] },
      { text: "Batcher retry backoff was fixed, improving submission reliability for the chains we host.", whyItMatters: "Fewer stalled submissions.", citations: ["a1b2c3d"] },
    ]),
  },
  {
    name: "leaks a secret in the text → HELD (safety)",
    expectPass: false, failed: "noLeakedSecrets",
    brief: mk([
      { text: "Rotated the batcher submission key and redeployed op-batcher to mainnet across the fleet this week.", citations: ["#4120"] },
      { text: "For the record the temporary CI deploy token was sk-live-9f8e7d6c5b4a3210fedcba9876543210 before rotation.", citations: ["a1b2c3d"] },
      { text: "OP Mainnet kept finalizing blocks on schedule with live transaction volume all week long.", citations: ["https://optimistic.etherscan.io/block/153361916"] },
    ]),
  },
];

describe("trust gate — labeled eval set (regression)", () => {
  for (const c of cases) {
    it(c.name, () => {
      const e = scoreBrief(c.brief, activity);
      expect(e.pass).toBe(c.expectPass);
      if (c.failed) expect(e.checks[c.failed]).toBe(false);
    });
  }
});
