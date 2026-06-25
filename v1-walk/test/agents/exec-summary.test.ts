import { describe, it, expect } from "vitest";
import { localReport, LocalSummarizer } from "../../src/agents/exec-summary/summary";
import type { MemoryItem } from "../../src/memory/store";

const items: MemoryItem[] = [
  { key: "k", source: "github", sourceId: "sha1", createdAt: "2026-06-25T00:00:00Z", payload: { kind: "commit", id: "sha1", url: "https://gh/c/sha1", label: "feat: fault proofs" } },
  { key: "k", source: "monday", sourceId: "deal-acme", createdAt: "2026-06-25T00:00:00Z", payload: { kind: "item", id: "deal-acme", url: "https://m/1", label: "Acme — Won" } },
  { key: "k", source: "slack", sourceId: "ts1", createdAt: "2026-06-25T00:00:00Z", payload: { kind: "message", id: "ts1", url: "https://s/1", label: "shipped upgrade 19" } },
  { key: "k", source: "notion", sourceId: "p1", createdAt: "2026-06-25T00:00:00Z", payload: { kind: "page", id: "p1", url: "https://n/1", label: "Launch notes" } },
];

describe("executive summary (local, grounded)", () => {
  it("groups memory into sections, one per source present", () => {
    const r = localReport(items, "2026-06-25T01:00:00Z");
    expect(r.engine).toBe("local");
    expect(r.stats).toEqual({ sources: 4, items: 4 });
    const headings = r.sections.map((s) => s.heading);
    expect(headings.some((h) => h.includes("Shipped"))).toBe(true);
    expect(headings.some((h) => h.includes("Deals"))).toBe(true);
  });

  it("is grounded by construction — every bullet cites a real artifact (id + url)", () => {
    const r = localReport(items, "2026-06-25T01:00:00Z");
    const bullets = r.sections.flatMap((s) => s.bullets);
    expect(bullets.length).toBe(4);
    for (const b of bullets) {
      expect(b.id).toBeTruthy();
      expect(b.url).toMatch(/^https?:/);
    }
  });

  it("caps each section and reports the overflow count", () => {
    const many: MemoryItem[] = Array.from({ length: 10 }, (_, i) => ({
      key: "k", source: "github", sourceId: `s${i}`, createdAt: "2026-06-25T00:00:00Z",
      payload: { kind: "commit", id: `s${i}`, url: `https://gh/${i}`, label: `commit ${i}` },
    }));
    const r = localReport(many, "2026-06-25T01:00:00Z");
    const gh = r.sections.find((s) => s.heading.includes("Shipped"))!;
    expect(gh.bullets).toHaveLength(6);
    expect(gh.more).toBe(4);
  });

  it("LocalSummarizer wraps localReport", async () => {
    const r = await new LocalSummarizer().summarize(items, "2026-06-25T01:00:00Z");
    expect(r.engine).toBe("local");
    expect(r.narrative).toBeUndefined();
  });
});
