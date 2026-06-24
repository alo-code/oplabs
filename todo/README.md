# todo/ — workplans (planned & ongoing work)

Each file here is a **workplan**: a problem turned into an ordered set of slices,
each shipped through the five-stage cadence (`CADENCE.md`). Workplans are
committed — the plan is part of what this repo is meant to show.

Use `WORKPLANTEMPLATE.md` to start one; read `skills/writing-workplans.md` for how
to make it good.

## Plans for review

| Workplan | Stage | Planning depth | Status |
|---|---|---|---|
| [`roadmap.md`](./roadmap.md) | — | the crawl·walk·run plan everything maps to | drafted |
| [`exec-brief-slice.md`](./exec-brief-slice.md) | Crawl | **fully sliced** (9 slices) | drafted |
| [`connectors-library.md`](./connectors-library.md) | Walk | **fully sliced** (3 phases) | drafted |
| [`shared-memory-postgres.md`](./shared-memory-postgres.md) | Walk | **fully sliced** (3 phases) | drafted |

## Sequence & dependencies

```
Crawl                Walk (next)
exec-brief-slice ──┬─► connectors-library      (generalizes exec-brief 1.2 GitHub connector + 1.1 config)
                   └─► shared-memory-postgres   (promotes exec-brief 1.3 MemoryStore; same interface)
```

- **Build order**: `exec-brief-slice` first (it earns trust on one workflow), then
  `connectors-library` and `shared-memory-postgres` (independent of each other; can
  go in either order or in parallel).
- The two Walk workplans deliberately **don't** depend on each other — connectors
  write through the existing `MemoryStore` interface regardless of which impl backs it.

## Not yet promoted to workplans (by design)

The rest of **Walk** (orchestrator service, observability + alerting, control-plane
v1, onboard existing workflows) and all of **Run** (self-serve, governance,
reliability/SLOs, polyglot + onchain seam) live as prose in
[`roadmap.md`](./roadmap.md). They get sliced into their own files when the Walk
gate nears — per the cadence, we don't detail Run from Crawl.

## Lifecycle
drafted → in-progress → closed. On close: a Completion addendum on the workplan,
proof under `evidence/<workplan-slug>/`, and a `CHANGELOG.md` line.
