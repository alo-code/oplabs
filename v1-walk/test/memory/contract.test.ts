import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import type { MemoryStore } from "../../src/memory/store";
import { InMemoryStore } from "../../src/memory/inmemory";
import { PostgresStore } from "../../src/memory/postgres";

// One contract suite, run against every implementation. The in-memory store always runs (zero-key);
// the Postgres store runs only when DATABASE_URL is set (e.g. CI or `npm run db:up`), so a fresh
// clone stays green offline while the real substrate is held to the IDENTICAL contract.
function memoryContract(name: string, make: () => MemoryStore): void {
  describe(`MemoryStore contract — ${name}`, () => {
    let store: MemoryStore;
    const tag = randomUUID().slice(0, 8); // isolate this run's rows from any shared DB
    beforeAll(() => {
      store = make();
    });
    afterAll(async () => {
      await store.close();
    });

    it("stores and recalls an item", async () => {
      const r = await store.store({ key: `k-${tag}`, source: `s-${tag}`, sourceId: "1", payload: { label: "hello" } });
      expect(r.stored).toBe(true);
      const items = await store.recall({ key: `k-${tag}` });
      expect(items.map((i) => i.sourceId)).toContain("1");
    });

    it("dedups by (source, sourceId), not content", async () => {
      const item = { key: `k-${tag}`, source: `dup-${tag}`, sourceId: "x", payload: { label: "v1" } };
      expect((await store.store(item)).stored).toBe(true);
      // same identity, different content → NOT stored again
      expect((await store.store({ ...item, payload: { label: "v2-edited" } })).stored).toBe(false);
      const items = await store.recall({ source: `dup-${tag}` });
      expect(items).toHaveLength(1);
    });

    it("seen() reflects what was stored", async () => {
      expect(await store.seen(`seen-${tag}`, "42")).toBe(false);
      await store.store({ key: `k-${tag}`, source: `seen-${tag}`, sourceId: "42", payload: {} });
      expect(await store.seen(`seen-${tag}`, "42")).toBe(true);
    });

    it("recall filters by source", async () => {
      await store.store({ key: `k-${tag}`, source: `a-${tag}`, sourceId: "1", payload: {} });
      await store.store({ key: `k-${tag}`, source: `b-${tag}`, sourceId: "1", payload: {} });
      const onlyA = await store.recall({ source: `a-${tag}` });
      expect(onlyA.every((i) => i.source === `a-${tag}`)).toBe(true);
    });

    it("healthcheck is ok", async () => {
      expect((await store.healthcheck()).ok).toBe(true);
    });
  });
}

memoryContract("in-memory", () => new InMemoryStore());

if (process.env.DATABASE_URL) {
  memoryContract("postgres", () => new PostgresStore({ connectionString: process.env.DATABASE_URL! }));
} else {
  describe.skip("MemoryStore contract — postgres (set DATABASE_URL to run)", () => {
    it("skipped", () => {});
  });
}
