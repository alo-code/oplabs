# v1-walk — platform design (design-only)

> Design, not code yet. This is the platform v0 graduates into once a 2nd/3rd workflow is pulling
> demand (see the Roadmap signals). The eventual code lands in `../src/`.

Walk turns the one-off into reusable infrastructure so the next workflow costs **days, not weeks**.
Four pillars:

| Pillar | Design |
|---|---|
| **Connectors** — a library + central auth | [`connectors-library.md`](./connectors-library.md) |
| **Shared memory** — Postgres + pgvector | [`shared-memory-postgres.md`](./shared-memory-postgres.md) |
| **Trust as a service** | the v0 trust core (`../../v0-crawl/src/trust/`) promoted from an n8n Code node to one HTTP service every workflow calls — same logic, same tests |
| **Control plane** | a web UI (trigger · history · output) spanning all workflows, beyond n8n's editor |

> The two design docs above predate the v0/v1/v2 + n8n split (they were the original "Walk"
> workplans). The *designs* hold — the connector interface and the memory schema are what v1
> builds; the old `src/` paths and crawl slice-numbers map to `v1-walk/` now.
