// trust.test.ts — defines what grounded + scored + BD-safe means.
// Multi-source: a bullet may cite GitHub, Monday, Notion, or Slack — by id,
// short SHA, or URL. Two hard gates: ungrounded fails; a BD "why it matters"
// line that invents an impact figure fails.

import { describe, it, expect } from "vitest";
import { parseActivity, parseBrief, type Activity, type Brief } from "../src/trust/schema";
import { checkGrounding } from "../src/trust/grounding";
import { scoreBrief } from "../src/trust/evals";

// Real-shaped fixture: the union of what n8n fetched across sources this week.
const activity: Activity = parseActivity({
  from: "2026-06-16T00:00:00Z",
  to: "2026-06-23T00:00:00Z",
  artifacts: [
    { kind: "commit", source: "github", id: "a1b2c3d4e5f6", url: "https://github.com/ethereum-optimism/optimism/commit/a1b2c3d4e5f6", label: "fix: batcher retry backoff" },
    { kind: "pr", source: "github", id: "#4120", url: "https://github.com/ethereum-optimism/optimism/pull/4120", label: "feat: span batch validation" },
    { kind: "issue", source: "monday", id: "MON-1187", url: "https://acme.monday.com/boards/1/pulses/1187", label: "Ship Coinbase onboarding flow" },
    { kind: "page", source: "notion", id: "notion-7af2", url: "https://www.notion.so/acme/Release-notes-7af2", label: "Release notes: week of Jun 16" },
    { kind: "message", source: "slack", id: "1718900000.001", url: "https://acme.slack.com/archives/C123/p1718900000001", label: "Span-batch validator is live on mainnet" },
  ],
});

const goodBrief: Brief = parseBrief({
  title: "Weekly shipped brief",
  window: { from: activity.from, to: activity.to },
  sections: [
    {
      heading: "Shipped",
      bullets: [
        { text: "Span-batch validation landed in the derivation pipeline.", whyItMatters: "Tighter batch validation means fewer reorg surprises for the chains we host.", citations: ["#4120"] },
        { text: "Batcher retry backoff was fixed.", whyItMatters: "Fewer stalled submissions, so customer chains post to L1 more reliably.", citations: ["a1b2c3d"] },
        { text: "Coinbase onboarding flow completed.", whyItMatters: "Unblocks the Coinbase rollout conversation for the deal team.", citations: ["MON-1187"] },
      ],
    },
    {
      heading: "Notable",
      bullets: [
        { text: "Weekly release notes published.", citations: ["https://www.notion.so/acme/Release-notes-7af2"] },
        { text: "Span-batch validator confirmed live on mainnet.", whyItMatters: "It is live, not just merged — safe to mention to partners.", citations: ["1718900000.001"] },
      ],
    },
  ],
});

const ungroundedBrief: Brief = parseBrief({
  title: "Weekly shipped brief",
  window: { from: activity.from, to: activity.to },
  sections: [
    {
      heading: "Shipped",
      bullets: [
        { text: "Span-batch validation landed.", citations: ["#4120"] },
        { text: "Launched a brand-new decentralized sequencer to every chain.", citations: ["#9999"] }, // unknown
        { text: "Throughput is way up this week.", citations: [] }, // uncited
      ],
    },
  ],
});

const speculativeBrief: Brief = parseBrief({
  title: "Weekly shipped brief",
  window: { from: activity.from, to: activity.to },
  sections: [
    {
      heading: "Shipped",
      bullets: [
        // citation is real (grounded), but the BD line invents a metric not in the cited PR.
        { text: "Span-batch validation landed.", whyItMatters: "Cuts customer proving costs by 40%.", citations: ["#4120"] },
      ],
    },
  ],
});

describe("checkGrounding (multi-source)", () => {
  it("grounds across GitHub, Monday, Notion, Slack — by id, short SHA, and URL", () => {
    const r = checkGrounding(goodBrief, activity);
    expect(r.grounded).toBe(true);
    expect(r.groundedRatio).toBe(1);
  });

  it("flags both unknown citations and uncited bullets", () => {
    const r = checkGrounding(ungroundedBrief, activity);
    expect(r.grounded).toBe(false);
    expect(r.violations.map((v) => v.reason).sort()).toEqual(["no-citations", "unknown-citation"]);
  });
});

describe("scoreBrief", () => {
  it("passes a grounded, well-formed, non-speculative brief", () => {
    const e = scoreBrief(goodBrief, activity);
    expect(e.checks.grounded).toBe(true);
    expect(e.checks.noSpeculativeImpact).toBe(true);
    expect(e.pass).toBe(true);
  });

  it("hard-fails an ungrounded brief", () => {
    const e = scoreBrief(ungroundedBrief, activity);
    expect(e.checks.grounded).toBe(false);
    expect(e.pass).toBe(false);
  });

  it("hard-fails a grounded brief that invents an impact metric for BD", () => {
    const e = scoreBrief(speculativeBrief, activity);
    expect(e.checks.grounded).toBe(true); // the citation is real…
    expect(e.checks.noSpeculativeImpact).toBe(false); // …but "40%" isn't in the cited PR
    expect(e.pass).toBe(false);
  });
});
