# todo/ — workplans (planned & ongoing work)

A workplan is a problem turned into ordered slices, each shipped through the cadence
(`CADENCE.md`). Use `WORKPLANTEMPLATE.md` to start one; `skills/writing-workplans.md` for how.

## Current state

| Plan | Maps to | Status |
|---|---|---|
| [`roadmap.md`](./roadmap.md) | the whole arc | current — polished + visual as `docs/crawl-walk-run.html` |
| [`exec-brief-slice.md`](./exec-brief-slice.md) | **v0-crawl** | ✅ **shipped** — built as an n8n workflow + a tested TS trust core, not the original 9 TS slices. Runnable: [`../v0-crawl/`](../v0-crawl/). The plan is kept for the record (how the thinking started). |

The two **Walk** workplans live in [`../v1-walk/docs/`](../v1-walk/docs/) and are now
**✅ closed as a thin-but-real slice** — both have a Completion record of what shipped vs. deferred:
- [`connectors-library.md`](../v1-walk/docs/connectors-library.md) — built: contract + central
  redacted auth + 5 real connectors + uniform telemetry. Deferred: retry/rate-limit wrapper.
- [`shared-memory-postgres.md`](../v1-walk/docs/shared-memory-postgres.md) — built: `MemoryStore`
  (in-memory + Postgres/pgvector), semantic recall, write-through, cross-process. Deferred: retention/PII.

Shipped beyond those specs (control plane + executive summary, local auth + `./beacon setup`, the
demo runthrough, ADR 0003 observability) — see [`../v1-walk/docs/README.md`](../v1-walk/docs/README.md)
and `CHANGELOG.md`. **What's next** (trust-as-a-service, connector resilience, memory governance,
scheduling, the OTel backend) is listed in that v1 README.

**Run** (governance, self-serve, onchain) lives as design in [`../v2-run/docs/`](../v2-run/docs/).

## Lifecycle
drafted → in-progress → closed. On close: a Completion note on the workplan, proof under
`evidence/`, a `CHANGELOG.md` line.
