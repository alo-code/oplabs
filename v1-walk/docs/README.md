# v1-walk — platform design + build record

> **Status: built as a thin-but-real slice.** The runnable code is in [`../src/`](../src/) (see
> [`../README.md`](../README.md) to run it). These docs are the original design workplans plus a
> **Completion** record of what actually shipped vs. what's deferred.

Walk turns the one-off into reusable infrastructure so the next workflow costs **days, not weeks**.

## The four pillars — built vs. designed

| Pillar | Design doc | State |
|---|---|---|
| **Connectors** — a library + central auth | [`connectors-library.md`](./connectors-library.md) | ✅ **built** — contract + registry, redacted credential registry, uniform telemetry, **5 real connectors** (GitHub, onchain, Slack, Notion, Monday), **bounded retry + rate-limit** (C3.1). Deferred: a declarative per-connector limit registry. |
| **Shared memory** — Postgres + pgvector | [`shared-memory-postgres.md`](./shared-memory-postgres.md) | ✅ **built** — one `MemoryStore`, in-memory + Postgres/pgvector impls under one contract suite, dedup, semantic recall, write-through, cross-process durability. Deferred: retention/PII hooks, hybrid recall. |
| **Trust as a service** | the v0 trust core, ported → `../src/trust/gate.ts` | ✅ **built** — v0's grounding + eval gate, now over multi-source memory: **Create Report is gated** — an ungrounded / fabricated-figure / secret-leaking brief is **held, not published** (`npm run trust`). Next: extract to a standalone HTTP service. |
| **Control plane** | (no original doc — see Completion below) | ✅ **built** — a zero-dep web console: **Create Report** (fetch all → activity feed → **trust-gated** executive brief), connector health, run history, metrics, and **in-app + CLI auth**. |

## Shipped beyond the original specs

The two design docs predate the build; these landed too and have evidence under `../evidence/`:
- **Control plane + executive summary** — one **Create Report** button → a grounded brief from
  multi-source shared memory (the case study's headline workflow, on the platform). Provider-swappable:
  Claude narrative when `ANTHROPIC_API_KEY` is set, deterministic + grounded otherwise.
- **Local authentication** — "Connect a service" in the app *and* `./beacon setup` (CLI wizard),
  both over a shared catalog (`../src/core/services.ts`); tokens → a gitignored `.env`, live-applied.
- **Demo runthrough** — `./beacon scenario` + `BEACON_FIXTURES=1` replay Slack/Notion/Monday through
  the real pipeline (labeled "demo data") so it's showable without tokens.
- **Observability decision** — `../../adr/0003-observability.md` (OpenTelemetry + pino + Langfuse).

## What's next (toward Run / v2)

✅ **All five hardening steps shipped:** trust-as-a-service (`src/trust/gate.ts`), connector resilience
(`src/connectors/resilience.ts`), **memory governance** (PII redaction + TTL — `src/memory/policy.ts`),
**scheduling** (always-on — `src/orchestrator/scheduler.ts`), and the **OTLP exporter** (opt-in —
`src/observability/otlp.ts`). Evidence: `../evidence/always-on-governance/`, `../evidence/trust-gate/`.

Toward **Run (v2)** proper:
1. **Self-serve workflow creation** for non-engineers (compose connectors + prompts behind guardrails).
2. **Governance at scale** — per-workflow budgets, RBAC, audit log, data-residency policy (extends the
   PII/redaction seam); the OTLP destination chosen with stakeholders (ADR 0003).
3. **A second full workflow** (prospect intel — highest survey demand) on the same machinery.
4. *(stretch)* extract the trust gate to a standalone HTTP **trust service** every workflow calls.

The signals that justify *starting* Walk — and moving on to Run — are on the
[Roadmap](../../docs/crawl-walk-run.html).
