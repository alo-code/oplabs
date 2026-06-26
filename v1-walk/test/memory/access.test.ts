import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import type { MemoryStore, Principal } from "../../src/memory/store";
import { InMemoryStore } from "../../src/memory/inmemory";
import { PostgresStore } from "../../src/memory/postgres";

// Read-side access control, held to ONE contract across both stores (the v2 design made real —
// ../../v2-run/docs/access-control.md). In-memory always runs (fresh clone, green offline); Postgres
// runs only with DATABASE_URL set, proving the SQL predicate scopes identically to the in-memory rule.
// The behaviors asserted: unrestricted = everyone; no principal = exec/admin sees all (the v1 default);
// a restricted row is visible iff the caller is named or in a named group; otherwise hidden (default-deny).
function accessContract(name: string, make: () => MemoryStore): void {
  describe(`read-side access control — ${name}`, () => {
    let store: MemoryStore;
    const tag = randomUUID().slice(0, 8); // isolate this run's rows from any shared DB
    const key = `acl-${tag}`;
    const alice: Principal = { id: "alice", groups: ["eng"] };
    const bob: Principal = { id: "bob", groups: ["sales"] };

    beforeAll(async () => {
      store = make();
      // four rows under one key: unrestricted, group-scoped, id-scoped, and out-of-reach.
      await store.store({ key, source: `open-${tag}`, sourceId: "1", payload: { label: "open quarterly numbers" } });
      await store.store({ key, source: `eng-${tag}`, sourceId: "2", payload: { label: "eng incident postmortem" }, acl: ["eng"] });
      await store.store({ key, source: `al-${tag}`, sourceId: "3", payload: { label: "alice 1:1 notes" }, acl: ["alice"] });
      await store.store({ key, source: `exec-${tag}`, sourceId: "4", payload: { label: "exec comp plan" }, acl: ["exec"] });
    });
    afterAll(async () => {
      await store.close();
    });

    const ids = async (principal?: Principal): Promise<string[]> =>
      (await store.recall({ key, principal })).map((i) => i.sourceId).sort();

    it("no principal = exec/admin mode sees everything (the v1 default)", async () => {
      expect(await ids()).toEqual(["1", "2", "3", "4"]);
    });

    it("unrestricted rows are visible to every caller", async () => {
      expect(await ids(bob)).toContain("1");
    });

    it("a caller sees rows ACL'd to one of its groups", async () => {
      expect(await ids(alice)).toContain("2"); // alice ∈ eng
    });

    it("a caller sees rows ACL'd to its id", async () => {
      expect(await ids(alice)).toContain("3"); // named directly
    });

    it("default-deny: a caller does NOT see rows it matches neither by id nor group", async () => {
      const a = await ids(alice);
      expect(a).not.toContain("4"); // exec-only, alice isn't exec
      expect(await ids(bob)).toEqual(["1"]); // bob (sales) sees only the unrestricted row
    });

    it("semantic recall is scoped BEFORE ranking (out-of-clearance rows never surface)", async () => {
      const got = await store.semanticRecall("confidential plans and notes", 10, { key, principal: bob });
      expect(got.map((i) => i.sourceId).sort()).toEqual(["1"]); // only the unrestricted row reaches bob
    });
  });
}

accessContract("in-memory", () => new InMemoryStore());

if (process.env.DATABASE_URL) {
  accessContract("postgres", () => new PostgresStore({ connectionString: process.env.DATABASE_URL! }));
} else {
  describe.skip("read-side access control — postgres (set DATABASE_URL to run)", () => {
    it("skipped", () => {});
  });
}
