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
