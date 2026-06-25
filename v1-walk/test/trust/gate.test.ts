import { describe, it, expect } from "vitest";
import { gateReport } from "../../src/trust/gate";
import type { Report } from "../../src/agents/exec-summary/summary";

const valid = new Set(["sha-1", "https://gh/1"]);

function base(): Report {
  return {
    title: "Brief",
    window: "x",
    generatedAt: "t",
    engine: "local",
    stats: { sources: 1, items: 1 },
    sections: [{ heading: "Shipped", bullets: [{ text: "feat: fault proofs (#20982)", source: "github", kind: "commit", id: "sha-1", url: "https://gh/1" }], more: 0 }],
  };
}

describe("trust gate (exec summary)", () => {
  it("publishes a grounded, clean report", () => {
    const v = gateReport(base(), valid);
    expect(v.published).toBe(true);
    expect(v.checks.grounded).toBe(true);
    expect(v.score).toBeGreaterThanOrEqual(0.8);
  });

  it("holds a report whose bullet cites an artifact not in memory", () => {
    const r = base();
    r.sections[0]!.bullets[0]!.id = "sha-FAKE";
    r.sections[0]!.bullets[0]!.url = "https://gh/fake";
    const v = gateReport(r, valid);
    expect(v.published).toBe(false);
    expect(v.checks.grounded).toBe(false);
  });

  it("holds a report whose NARRATIVE invents an uncited figure", () => {
    const r = base();
    r.engine = "claude";
    r.narrative = "Shipped fault proofs — 40% faster withdrawals.";
    const v = gateReport(r, valid);
    expect(v.published).toBe(false);
    expect(v.checks.noFabricatedFigures).toBe(false);
    expect(v.heldReason).toMatch(/fabricated/);
  });

  it("allows a narrative figure that IS present in a cited artifact", () => {
    const r = base();
    r.sections[0]!.bullets[0]!.text = "perf: 40% faster fault proofs (#20982)";
    r.engine = "claude";
    r.narrative = "Fault proofs are now 40% faster.";
    const v = gateReport(r, valid);
    expect(v.checks.noFabricatedFigures).toBe(true);
    expect(v.published).toBe(true);
  });

  it("holds a report that leaks a secret (even when otherwise grounded)", () => {
    const r = base();
    r.sections[0]!.bullets[0]!.text = "oops committed sk-ant-abcdefghijklmnop12345";
    const v = gateReport(r, valid);
    expect(v.published).toBe(false);
    expect(v.checks.noLeakedSecrets).toBe(false);
  });

  it("holds an empty report", () => {
    const r = base();
    r.sections = [];
    const v = gateReport(r, valid);
    expect(v.published).toBe(false);
    expect(v.checks.structure).toBe(false);
  });
});
