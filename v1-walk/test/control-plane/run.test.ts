import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineConnector } from "../../src/connectors/base";
import { ConnectorRegistry } from "../../src/connectors/registry";
import { InMemoryStore } from "../../src/memory/inmemory";
import { executeRun } from "../../src/control-plane/run";

const fake = defineConnector({
  name: "fake",
  capabilities: ["read"],
  paramsSchema: z.object({ n: z.number() }),
  resultSchema: z.any(),
  fetch: async ({ n }) => ({
    source: "fake",
    window: { from: "a", to: "b" },
    artifacts: Array.from({ length: n }, (_, i) => ({ kind: "x", source: "fake", id: `id-${i}`, url: "u", label: `item ${i}` })),
  }),
});

describe("control plane executeRun", () => {
  it("fetches via a connector and writes through to memory", async () => {
    const reg = new ConnectorRegistry().register(fake);
    const store = new InMemoryStore();
    const summary = await executeRun(reg, store, "fake", { n: 3 });
    expect(summary).toMatchObject({ connector: "fake", ok: true, fetched: 3, stored: 3, deduped: 0 });
    expect(await store.recall()).toHaveLength(3);
  });

  it("is idempotent — a re-run dedups", async () => {
    const reg = new ConnectorRegistry().register(fake);
    const store = new InMemoryStore();
    await executeRun(reg, store, "fake", { n: 2 });
    const second = await executeRun(reg, store, "fake", { n: 2 });
    expect(second).toMatchObject({ stored: 0, deduped: 2 });
  });

  it("returns ok=false for an unknown connector (no throw)", async () => {
    const summary = await executeRun(new ConnectorRegistry(), new InMemoryStore(), "nope", {});
    expect(summary.ok).toBe(false);
    expect(summary.error).toMatch(/unknown/);
  });

  it("captures a connector error as a summary, not a crash", async () => {
    const boom = defineConnector({
      name: "boom",
      paramsSchema: z.object({}),
      resultSchema: z.any(),
      fetch: async () => {
        throw new Error("kaboom");
      },
    });
    const reg = new ConnectorRegistry().register(boom);
    const summary = await executeRun(reg, new InMemoryStore(), "boom", {});
    expect(summary.ok).toBe(false);
    expect(summary.error).toContain("kaboom");
  });
});
