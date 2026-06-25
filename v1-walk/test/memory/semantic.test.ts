import { describe, it, expect } from "vitest";
import { InMemoryStore } from "../../src/memory/inmemory";

// Tests the recall MECHANISM with the zero-key local (lexical) embedding: the item that shares
// tokens with the query ranks first. Real semantic recall (paraphrase matching) needs a real
// embeddings provider — same code path, different `Embeddings` impl.
describe("semantic recall (local lexical embeddings)", () => {
  it("ranks the relevant prior item first", async () => {
    const store = new InMemoryStore();
    await store.store({ key: "k", source: "github", sourceId: "1", payload: { label: "feat: add fault proofs to the bridge withdrawal path" } });
    await store.store({ key: "k", source: "github", sourceId: "2", payload: { label: "chore: bump eslint and prettier config" } });
    await store.store({ key: "k", source: "github", sourceId: "3", payload: { label: "docs: update the README badges" } });

    const hits = await store.semanticRecall("fault proof bridge withdrawal", 3);
    expect(hits[0]!.sourceId).toBe("1");
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);
  });

  it("honors a key filter", async () => {
    const store = new InMemoryStore();
    await store.store({ key: "week-26", source: "github", sourceId: "1", payload: { label: "sequencer fee accounting" } });
    await store.store({ key: "week-25", source: "github", sourceId: "2", payload: { label: "sequencer fee accounting" } });
    const hits = await store.semanticRecall("fee accounting", 5, { key: "week-26" });
    expect(hits.every((h) => h.key === "week-26")).toBe(true);
  });
});
