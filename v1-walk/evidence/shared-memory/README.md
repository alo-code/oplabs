# Evidence — shared memory (W2): cross-agent context, real data, zero keys

**Captured:** 2026-06-24 · **Command:** `cd v1-walk && npm install && npm run memory`
**Environment:** fresh clone, no `.env`, in-memory store (the Postgres+pgvector path runs the same
code when `DATABASE_URL` is set — `npm run db:up`).

## What this proves (cadence stage 5)

- **Pain ④ (no shared memory) fixed concretely:** agent `exec-brief` writes real GitHub activity
  into shared memory; agent `qa-probe` reads it back via semantic recall — one agent using another's
  context, no re-fetch.
- **Pain ① (re-fetch per task):** write-through is **idempotent** — the re-run stored 0 / deduped 47.
  Dedup is keyed by `(source, sourceId)` (identity), not content.
- **One interface, swappable substrate:** the identical `MemoryStore` contract suite is green for the
  in-memory impl (always) and the Postgres impl (when `DATABASE_URL` is set) — `test/memory/contract.test.ts`.

## Captured output

```
Beacon v1 — shared memory (in-memory)

agent "exec-brief" wrote 47 items from ethereum-optimism/optimism (0 dedup)
  re-run is idempotent: 0 stored, 47 dedup

agent "qa-probe" asks shared memory: "fault proofs / withdrawal bridge?"
  0.272  [written by exec-brief]  chore(deps): bump Go vulnerability deps (#21450)
  0.154  [written by exec-brief]  feat: add FeeVault withdrawal route setter (#20982)
  0.144  [written by exec-brief]  superchain: couple registry via hoisted root submodule (#21474)

recall({ key }) → 3 most-recent items:
  - docs: add permissioned fault proof chains note to Upgrade 19 notice (#21484)
  - superchain: couple registry via hoisted root submodule (#21474)
  - feat(op-reth): load OP Mainnet/Sepolia from superchain-registry, drop Base (#21397)

metrics:
  memory_store_total{result=stored} count=47
  memory_store_total{result=dedup} count=47
  semantic_recall_latency_ms{mode=semantic} count=1
  memory_recall_latency_ms{mode=structured} count=1
  ...
```

## Honest caveats

- The zero-key embedding is **lexical** (hashed bag-of-words), so recall scores reflect token
  overlap, not true semantics — enough to demo the mechanism. A real embeddings provider (config)
  drops into the same `Embeddings` interface for semantic paraphrase matching.
- In-memory shares within one process; **Postgres makes it durable + cross-host** — that's the real
  substrate, brought up with `docker-compose` (`migrations/0001_memory.sql` applies on first boot).
