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

✅ Done: **trust-as-a-service** (the exec summary is now eval-gated — `src/trust/gate.ts`) and
**connector resilience** (bounded retry + rate-limit — `src/connectors/resilience.ts`). Remaining:

1. **Memory governance** — retention/TTL + PII redaction hooks (M3.3) — the Security/Legal seam.
2. **Scheduling** — the brief on a cron, not a button (the "always-on" half; v0 has it via n8n).
3. **Observability backend** — wire the OTLP exporter behind the facade (per ADR 0003).
4. *(stretch)* extract the trust gate to a standalone HTTP **trust service** every workflow calls.

The signals that justify *starting* Walk — and moving on to Run — are on the
[Roadmap](../../docs/crawl-walk-run.html).
