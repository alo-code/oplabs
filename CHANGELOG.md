# Changelog

All notable changes to Beacon are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/). Workplan outcomes graduate
to this file (under `## [Unreleased]`) plus an `evidence/<workplan>/` dir.

## [Unreleased]

### Added

- **v1-walk built as a runnable, thin-but-real platform slice** (separate from v0's n8n, but
  interoperable — emits v0's Artifact shape). Runs on a fresh clone with zero keys; 29 tests (+1
  Postgres skipped without `DATABASE_URL`), typecheck clean.
  - **Connector library + central auth** (pains ③/⑤): `defineConnector` (zod parse-in/out, uniform
    telemetry by construction), a registry (discovery + live health), a central credential registry
    whose `Secret` won't serialize, and two **real** connectors — GitHub (public, no token) + onchain
    (viem → OP Mainnet). `npm run connectors`. Evidence: `v1-walk/evidence/connectors-library/`.
  - **Shared memory** (pains ①/④): one `MemoryStore`, two impls (in-memory + Postgres/pgvector)
    under one contract suite; write-through, dedup by `(source, sourceId)`, semantic recall via a
    swappable `Embeddings` (zero-key lexical stand-in). Cross-agent read proven. `npm run memory` ·
    `docker-compose.yml` + `migrations/`. Evidence: `v1-walk/evidence/shared-memory/`.
  - **Control plane** (pain ⑥): a zero-dependency `node:http` page — connectors + health, Run-now,
    recent memory, run history, metrics. `npm run control-plane`. Evidence: `v1-walk/evidence/control-plane/`.
- **Control plane: one "Create Report" button** → fetch every healthy source → live activity feed →
  a **grounded executive summary** (`src/agents/exec-summary/`); Claude narrative when keyed, grounded
  + deterministic otherwise.
- **Trust gate + connector resilience**: the exec summary is now **eval-gated** (v0's grounding/evals
  ported to `src/trust/gate.ts`) — an ungrounded / fabricated-figure / secret-leaking brief is **held,
  not published** (`npm run trust`; shown on the page). Every connector gets **bounded retry +
  rate-limit** (`src/connectors/resilience.ts`; transient vs terminal via `HttpError`).
- **Always-on + governance + observability + a zero-dep demo**:
  - **Scheduling** (`src/orchestrator/scheduler.ts`) — the brief reruns on `BEACON_SCHEDULE`, not just a
    click; surfaced as a ⏱ pill + growing run history.
  - **Memory governance** (`src/memory/policy.ts`) — PII redaction (emails/phones/secrets) + optional
    TTL at write time, shown as 🔒 in the feed (M3.3, the Security/Legal seam).
  - **OTLP export** (`src/observability/otlp.ts`) — opt-in metrics export behind the facade; off by
    default, zero extra containers (ADR 0003).
  - **`./beacon demo`** — one zero-dependency command (no Docker, no keys) that anyone can run: control
    plane + demo data + a live schedule. (`./beacon up` remains the Postgres end-to-end.)
- **Local onboarding + authentication**: `docs/onboarding.html` (Quickstart, in the nav); **"Connect a
  service"** in the app and a **`./beacon setup`** CLI wizard over one shared catalog
  (`src/core/services.ts`) — tokens to a gitignored `.env`, live-applied; the server binds localhost
  and never logs token values.
- **Demo runthrough**: `./beacon scenario` + `BEACON_FIXTURES=1` replay Slack/Notion/Monday through the
  real pipeline (labeled "demo data"); `src/connectors/fixtures.ts`.
- **v1 Walk workplans closed** with Completion records (connectors-library, shared-memory-postgres) —
  what shipped vs. deferred (retry/rate-limit, retention/PII, hybrid recall).
- **ADR 0003 — observability**: instrument once (OpenTelemetry + pino + Langfuse for the LLM layer)
  behind the in-house facade; backend destination deferred (config, not code).
- Repo scaffold: five-stage `CADENCE.md`, `CLAUDE.md`, `skills/`, `todo/`,
  `evidence/`, navigable `docs/`, and a runnable TypeScript workspace.
- First workplan drafted: `todo/exec-brief-slice.md` (weekly exec brief).
- `v3-sprint` design stage: an internal **MCP server** for ambient, grounded,
  governed access to company memory from any AI tool (Claude Code, Cursor,
  Claude.ai, Slack). Scaffolded `v3-sprint/` (design-only) + added across the
  docs site (versions, roadmap, architecture, overview). The metaphor extends
  crawl → walk → run → **sprint**; v2 relabeled "org-wide & governed" so v3 is
  the single end-state vision.
