# Shared Memory (Postgres + pgvector) — durable, shared, queryable

**Branch**: `feat/shared-memory-postgres` (suggested)
**Drafted**: 2026-06-23
**Sizing**: ~3–4 engineer-days
**Status**: ✅ closed (thin-but-real slice — see Completion at the bottom)
**Stage**: Walk (second Walk workplan)
**Depends on**: `exec-brief-slice.md` 1.3 (the `MemoryStore` interface + file
impl). This workplan adds a Postgres impl **behind the same interface**, so
nothing above memory changes. Pairs well with `connectors-library.md`
(write-through) but doesn't block it.

## Problem

The crawl slice used a file-backed memory (`store`/`recall`/`seen`) — correct for
one workflow on one machine, but it doesn't survive the move off a laptop, can't be
queried, and can't be shared. Two agents that both care about "the Acme deal" can't
see each other's context, so the brief's "no shared memory across agents" pain and
the "context re-fetched per task" pain both persist the moment there's more than one
agent or more than one host. Consequence: agents stay isolated and the platform
can't compound knowledge.

## Solution (this workplan)

Promote memory to a **Postgres**-backed store with **structured records** (runs,
items, entities) and **semantic recall** via **pgvector** — implementing the
existing `MemoryStore` interface so the exec-brief agent is unchanged. Add a
deliberate, parity-checked **cutover**, then prove a second agent reads the same
memory. Bake in retention/PII hooks (the Security/Legal seam the JD calls out).

## Phases

- Phase M1 — Postgres-backed structured memory (same interface)
- Phase M2 — Semantic recall (pgvector)
- Phase M3 — Cutover + shared access + policy

## Cadence

Follows `CADENCE.md`. **Note the one non-collapse rule applies here:** every
schema migration is a **separate commit** from the code that uses it (deployment
ordering — migrate ahead of code). Each migration slice below names its migration
as the contract and the consuming code as a later green.

---

## Phase M1 — Postgres-backed structured memory

### M1.1 Schema + migration (contract = the migration; separate commit)
- **Files**: `migrations/0001_memory.sql` (new), `src/memory/schema.ts` (new)
- **Contract**: tables `memory_items(id, key, source, source_id, payload jsonb,
  fetched_at, created_at)`, `runs(id, agent, started_at, status, cost, eval_score)`,
  `entities(id, type, name, attrs jsonb)`; indexes on `(key)`, `(source, source_id)`.
  Migration is reversible. **Commit 1, standalone**, so it deploys before any code
  reads it.
- **Red**: `test/memory/migration.test.ts > applies and rolls back cleanly` —
  spins up Postgres (testcontainers/docker), applies up then down; fails today.
- **Observability**: migration runner logs version applied; `schema_version` gauge.
- **Green**: the migration + runner (this slice's "green" is the runner; the SQL is
  the contract commit).
- **Evidence**: `evidence/shared-memory-postgres/M1.1/` — up/down run capture;
  `\d memory_items` output.
- **Effort**: ~0.75d
- [ ] Done

### M1.2 Postgres MemoryStore impl (same interface)
- **Files**: `src/memory/postgres.ts` (new)
- **Contract**: a `MemoryStore` impl (`store`/`recall`/`seen`/`markSeen`) backed by
  the M1.1 schema. Same interface as the file impl — callers don't change. Dedup is
  keyed by `(source, source_id)`, not content hash (carry the exec-brief learning).
- **Red**: `test/memory/postgres.test.ts > does not re-surface seen items` — the
  same contract test the file impl passes, now run against Postgres; fails today.
- **Observability**: `memory_query_latency_ms{op}`, `memory_items_total`,
  `memory_dedup_hits_total`, pool in-use gauge.
- **Green**: the impl (uses the migrated schema from M1.1).
- **Evidence**: `evidence/shared-memory-postgres/M1.2/` — interface contract suite
  green against Postgres; latency snapshot.
- **Effort**: ~0.75d
- [ ] Done

### M1.3 Connection, pooling, healthcheck
- **Files**: `src/memory/pool.ts` (new), `src/core/config.ts` (edit: `DATABASE_URL`)
- **Contract**: a pooled client + `healthcheck()`; clean startup/shutdown; config
  fails fast if `DATABASE_URL` is set-but-bad.
- **Red**: `test/memory/pool.test.ts > healthcheck fails on bad URL` — expects a
  red healthcheck, not a hang; fails today.
- **Observability**: `db_pool_in_use`, `db_pool_waiting`, healthcheck gauge.
- **Green**: the pool + healthcheck.
- **Evidence**: `evidence/shared-memory-postgres/M1.3/` — healthcheck red on bad
  URL, green on good; pool metrics under a small load.
- **Effort**: ~0.5d
- [ ] Done

### Phase M1 Exit Gate
- [ ] The file impl and Postgres impl pass the **same** `MemoryStore` contract test.
- [ ] Migrations apply and roll back cleanly in CI against a real Postgres.
- [ ] A bad DB config fails loud and fast (no silent hang).

---

## Phase M2 — Semantic recall (pgvector)

### M2.1 Embeddings interface + vector migration (separate commit)
- **Files**: `migrations/0002_pgvector.sql` (new), `src/memory/embeddings.ts` (new)
- **Contract**: enable `pgvector`, add `embedding vector(N)` + an ANN index to
  `memory_items` (migration, **standalone commit**). `Embeddings.embed(text)` behind
  a provider-swappable interface (model choice is config, per the JD's Gemini/Claude
  note).
- **Red**: `test/memory/embeddings.test.ts > embeds to expected dim` + a migration
  up/down test; fail today.
- **Observability**: `embedding_requests_total`, `embedding_latency_ms`, cost.
- **Green**: the embeddings adapter + index usage.
- **Evidence**: `evidence/shared-memory-postgres/M2.1/` — migration capture; a real
  embedding call with dim + cost.
- **Effort**: ~0.75d
- [ ] Done

### M2.2 Semantic recall
- **Files**: `src/memory/postgres.ts` (edit)
- **Contract**: `semanticRecall(query, k)` returns top-k items by cosine similarity,
  with scores. Added to the interface as an optional capability (file impl may
  no-op / linear-scan).
- **Red**: `test/memory/semantic.test.ts > retrieves the relevant prior item` — seed
  items, query a paraphrase, expect the right item in top-k; fails today. (This is an
  **eval**, not an exact assertion — assert relevance/rank, not exact text.)
- **Observability**: `semantic_recall_latency_ms`, `semantic_recall_hits` (k), and a
  recall@k eval score on the seed set.
- **Green**: the cosine query over the ANN index.
- **Evidence**: `evidence/shared-memory-postgres/M2.2/` — query → ranked results with
  scores; recall@k on the seed set.
- **Effort**: ~0.75d
- [ ] Done

### M2.3 Hybrid recall
- **Files**: `src/memory/postgres.ts` (edit)
- **Contract**: `recall` can combine a structured filter (key/source/time) with
  semantic ranking, so "recent Acme items most relevant to X" is one call.
- **Red**: `test/memory/hybrid.test.ts > filter + rank` — expects results that match
  the filter AND are semantically ranked; fails today.
- **Observability**: reuse recall metrics with a `mode` label (structured|semantic|hybrid).
- **Green**: the hybrid query.
- **Evidence**: `evidence/shared-memory-postgres/M2.3/` — a hybrid query capture.
- **Effort**: ~0.5d
- [ ] Done

### Phase M2 Exit Gate
- [ ] Semantic recall returns the relevant prior item on the seed eval (recall@k
      above floor).
- [ ] Embedding spend is visible per run; no unbounded re-embedding (dedup by
      content hash for embeddings only — opposite of item dedup, and documented why).

---

## Phase M3 — Cutover + shared access + policy

### M3.1 Cut exec-brief over (flagged, parity-checked)
- **Files**: `src/agents/exec-brief/brief.ts` (edit), config flag `MEMORY_BACKEND`
- **Contract**: exec-brief uses Postgres memory when `MEMORY_BACKEND=postgres`,
  file otherwise. Output must be at parity with the file impl.
- **Red**: `test/exec-brief/parity.test.ts > same brief on both backends` — run the
  agent on both, assert equivalent grounded output; fails until the Postgres path is
  wired.
- **Observability**: `agent_runs_total{backend}`; parity-diff count.
- **Green**: the flag + wiring.
- **Evidence**: `evidence/shared-memory-postgres/M3.1/` — same brief, both backends;
  parity diff = 0.
- **Effort**: ~0.5d
- [ ] Done

### M3.2 Prove shared access (a second reader)
- **Files**: `src/agents/qa/probe.ts` (new — minimal)
- **Contract**: a minimal Q&A probe reads exec-brief's stored briefs/items from the
  shared store and answers "what shipped last week?" — i.e. agent B uses agent A's
  memory. This is the concrete proof the "shared memory" pain is fixed.
- **Red**: `test/qa/shared.test.ts > reads another agent's memory` — expects the
  probe to ground an answer in items exec-brief wrote; fails today.
- **Observability**: `cross_agent_reads_total`.
- **Green**: the probe (read-only; not a full agent).
- **Evidence**: `evidence/shared-memory-postgres/M3.2/` — probe answer citing
  exec-brief's stored items.
- **Effort**: ~0.5d
- [ ] Done

### M3.3 Retention + PII hooks (Security/Legal seam)
- **Files**: `src/memory/policy.ts` (new)
- **Contract**: a write-time policy hook — per-source TTL, field redaction, and an
  allow/deny for storing full bodies vs metadata-only. Default conservative
  (metadata + ids unless a source is explicitly cleared for bodies).
- **Red**: `test/memory/policy.test.ts > redacts + honors TTL` — expects a flagged
  field stripped on store and expired items not recalled; fails today.
- **Observability**: `memory_redactions_total`, `memory_ttl_evictions_total`.
- **Green**: the policy hook in the store write path.
- **Evidence**: `evidence/shared-memory-postgres/M3.3/` — a store call with
  redaction; a TTL eviction.
- **Effort**: ~0.75d
- [ ] Done

### Phase M3 Exit Gate
- [ ] exec-brief runs on Postgres memory at parity with the file impl.
- [ ] A second agent demonstrably reads the first agent's memory (shared context).
- [ ] No full body is stored for a source that isn't policy-cleared; TTL + redaction
      are enforced at write time and provable in evidence.

---

## Risk + rollback
- **Data loss / bad migration**: migrations are reversible and tested up+down (M1.1);
  cutover is flagged + parity-checked (M3.1) before the file impl is retired. Rollback:
  flip `MEMORY_BACKEND=file` — instant, no data dependency.
- **PII / sensitive data in memory**: conservative default (metadata-only) + write-time
  redaction + TTL (M3.3); Security/Legal review before any source is cleared for full
  bodies. Rollback: policy denies by default, so the failure mode is "stored too little,"
  not "leaked."
- **Embedding cost runaway**: per-run embedding spend metered (M2.1); embeddings deduped
  by content hash so unchanged items aren't re-embedded. Alert on cost-per-run.
- **Revert order**: `MEMORY_BACKEND=file` (instant) → revert M2/M3 → keep M1 (a working
  Postgres store is independently useful). Each phase leaves the system working.

## Completion

**Status: closed as a thin-but-real slice** (2026-06-25). Built in `../src/memory/`, runnable
(`npm run memory`; `npm run db:up` for Postgres). Evidence in `../evidence/shared-memory/` +
`../evidence/local-postgres/`.

- **Shipped:**
  - One **`MemoryStore`** interface, two impls — `InMemoryStore` (zero-key) and `PostgresStore`
    (Postgres + pgvector) — held to the **same contract suite** (M1). Dedup keyed by
    `(source, source_id)`, not content. `docker-compose.yml` + `migrations/0001_memory.sql`.
  - **Semantic recall** via pgvector cosine, behind a **swappable `Embeddings`** interface with a
    zero-key local (lexical) stand-in — M2.1/M2.2.
  - **Write-through** + a proven **cross-process read** (the control-plane process and the demo both
    read/write one Postgres) — the M3.2 "shared memory" payoff, made concrete.
- **Descoped / deferred:**
  - **M3.3 retention + PII hooks** — ✅ now shipped as `src/memory/policy.ts` (`PolicyStore` decorator):
    **PII redaction at write time** (emails / phones / secrets, flagged + shown in the feed) and an
    **optional TTL** on recall (`BEACON_MEMORY_TTL`). Deferred: per-source policy + metadata-vs-body rules.
  - **M2.3 hybrid recall** (structured filter + semantic rank in one call) — basic structured and
    semantic recall shipped; combined ranking deferred.
  - **Embedding cost guard** (dedup embeddings by content hash) — moot for the free local embedder;
    needed when a real provider is wired.
- **Evidence:** `../evidence/shared-memory/` (cross-agent read) + `../evidence/local-postgres/`
  (the contract suite running green against real Postgres — 34/34).
