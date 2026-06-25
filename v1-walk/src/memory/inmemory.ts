// inmemory.ts — the zero-key MemoryStore: a Map + linear-scan cosine.
//
// Correct for a fresh clone and for tests; single-process (two agents share memory by sharing the
// instance). The Postgres impl is the same contract made cross-process/host. Keeping both behind one
// interface is the whole point — nothing above memory changes when the substrate does.

import { performance } from "node:perf_hooks";
import { LocalEmbeddings, cosine, type Embeddings } from "./embeddings";
import { metrics } from "../observability/telemetry";
import {
  countStore,
  dedupKey,
  embedText,
  type MemoryItem,
  type MemoryStore,
  type RecallQuery,
  type ScoredItem,
} from "./store";

type StoredItem = MemoryItem & { embedding: number[] };

export class InMemoryStore implements MemoryStore {
  private readonly items = new Map<string, StoredItem>();

  constructor(private readonly embeddings: Embeddings = new LocalEmbeddings()) {}

  async store(item: MemoryItem): Promise<{ stored: boolean }> {
    const k = dedupKey(item.source, item.sourceId);
    if (this.items.has(k)) {
      countStore(false);
      return { stored: false };
    }
    const embedding = await this.embeddings.embed(embedText(item));
    this.items.set(k, { ...item, createdAt: item.createdAt ?? new Date().toISOString(), embedding });
    countStore(true);
    return { stored: true };
  }

  async recall(query: RecallQuery = {}): Promise<MemoryItem[]> {
    const start = performance.now();
    let out = [...this.items.values()];
    if (query.key) out = out.filter((i) => i.key === query.key);
    if (query.source) out = out.filter((i) => i.source === query.source);
    if (query.agent) out = out.filter((i) => i.agent === query.agent);
    out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    metrics.observe("memory_recall_latency_ms", performance.now() - start, { mode: "structured" });
    return out.slice(0, query.limit ?? 50).map(toPublic);
  }

  async seen(source: string, sourceId: string): Promise<boolean> {
    return this.items.has(dedupKey(source, sourceId));
  }

  async semanticRecall(text: string, k = 5, filter?: { key?: string }): Promise<ScoredItem[]> {
    const start = performance.now();
    const q = await this.embeddings.embed(text);
    let pool = [...this.items.values()];
    if (filter?.key) pool = pool.filter((i) => i.key === filter.key);
    const scored = pool
      .map((i) => ({ ...toPublic(i), score: cosine(q, i.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    metrics.observe("semantic_recall_latency_ms", performance.now() - start, { mode: "semantic" });
    return scored;
  }

  async healthcheck(): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: `${this.items.size} items (in-memory)` };
  }

  async close(): Promise<void> {}
}

function toPublic(i: StoredItem): MemoryItem {
  return { key: i.key, source: i.source, sourceId: i.sourceId, agent: i.agent, payload: i.payload, createdAt: i.createdAt };
}
