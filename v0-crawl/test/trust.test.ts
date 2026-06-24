// trust.test.ts — the "red" of the cadence: these define what grounded + scored
// means before the logic exists. A known-bad (ungrounded) brief must fail; a
// grounded, well-formed one must pass.

import { describe, it, expect } from "vitest";
import { parseActivity, parseBrief, type Activity, type Brief } from "../src/trust/schema";
import { checkGrounding } from "../src/trust/grounding";
import { scoreBrief } from "../src/trust/evals";

// Real-shaped fixture (the kind n8n would hand over after the GitHub fetch).
const activity: Activity = parseActivity({
  repos: ["ethereum-optimism/optimism"],
  from: "2026-06-16T00:00:00Z",
  to: "2026-06-23T00:00:00Z",
  artifacts: [
    { kind: "commit", id: "a1b2c3d4e5f6", repo: "ethereum-optimism/optimism", message: "fix: batcher retry backoff" },
    { kind: "pr", id: "#4120", repo: "ethereum-optimism/optimism", title: "feat: span batch validation" },
    { kind: "pr", id: "#4131", repo: "ethereum-optimism/optimism", title: "chore: bump op-geth" },
  ],
});

const goodBrief: Brief = parseBrief({
  title: "Weekly engineering brief",
  window: { from: activity.from, to: activity.to },
  sections: [
    {
      heading: "Shipped",
      bullets: [
        { text: "Span batch validation landed, tightening how the derivation pipeline accepts batches from L1.", citations: ["#4120"] },
        { text: "Batcher retry backoff was fixed so transient L1 submission failures no longer stall submission.", citations: ["a1b2c3d"] }, // short SHA prefix
      ],
    },
    {
      heading: "Maintenance",
      bullets: [
        { text: "Bumped op-geth to pull the latest execution-layer fixes for node operators.", citations: ["#4131"] },
      ],
    },
  ],
});

const badBrief: Brief = parseBrief({
  title: "Weekly engineering brief",
  window: { from: activity.from, to: activity.to },
  sections: [
    {
      heading: "Shipped",
      bullets: [
        { text: "Span batch validation landed, tightening derivation-pipeline batch acceptance from L1.", citations: ["#4120"] },
        { text: "Rolled out a brand-new decentralized sequencer to every chain in production.", citations: ["#9999"] }, // unknown citation
        { text: "Overall performance improved by 40% across the board this week.", citations: [] }, // ungrounded number, no citation
      ],
    },
  ],
});

describe("checkGrounding", () => {
  it("passes a brief whose every bullet cites a real artifact (incl. short SHA)", () => {
    const r = checkGrounding(goodBrief, activity);
    expect(r.grounded).toBe(true);
    expect(r.violations).toHaveLength(0);
    expect(r.groundedRatio).toBe(1);
  });

  it("flags both unknown citations and uncited bullets", () => {
    const r = checkGrounding(badBrief, activity);
    expect(r.grounded).toBe(false);
    const reasons = r.violations.map((v) => v.reason).sort();
    expect(reasons).toEqual(["no-citations", "unknown-citation"]);
    expect(r.groundedRatio).toBeLessThan(1);
  });
});

describe("scoreBrief", () => {
  it("passes a grounded, well-formed brief", () => {
    const e = scoreBrief(goodBrief, activity);
    expect(e.checks.grounded).toBe(true);
    expect(e.checks.wordBand).toBe(true);
    expect(e.pass).toBe(true);
    expect(e.score).toBeGreaterThanOrEqual(e.floor);
  });

  it("hard-fails an ungrounded brief even when structure is fine", () => {
    const e = scoreBrief(badBrief, activity);
    expect(e.checks.grounded).toBe(false);
    expect(e.pass).toBe(false);
  });
});
