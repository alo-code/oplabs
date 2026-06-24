# Contributing to Beacon

Beacon is built so the *method* is explicit — so a new teammate (or an AI agent) can
contribute without one person in the loop. That's the whole point of the project; here's the path.

## Orient (5 min)
1. **`README.md`** — what this is + the three-version layout (`v0-crawl` / `v1-walk` / `v2-run`).
2. **`docs/index.html`** (or https://oplabs.daciasec.net) — the approach + crawl-walk-run plan.
3. **`CADENCE.md`** — how every change ships: contract → failing test → observability → green → evidence.

## Run it (2 min)
```bash
cd v0-crawl && npm install && npm test   # the trust core (5/5 green)
npm run demo                             # watch the trust gate hold a bad brief
```
The full workflow runs in n8n.cloud — see `v0-crawl/workflow/README.md`.

## Pick up work
Planned work lives in `todo/` and each version's `docs/`. **Read the matching skill before you start:**

| You're… | Read |
|---|---|
| starting any task | `skills/ai-driven-development.md` + `CADENCE.md` |
| changing the n8n workflow (or editing it as a non-engineer) | `skills/n8n-workflow.md` |
| editing the docs site | `skills/docs-site.md` |
| adding a connector / agent (v1) | `skills/connector-pattern.md` · `skills/agent-pattern.md` |
| making output testable | `skills/evals-and-observability.md` |
| planning a chunk of work | `skills/writing-workplans.md` |

## Ship it
- Follow the cadence. **`npm test` and `npm run typecheck` green** before a change is done.
- Keep **`notes.md`** honest (append-only) — `skills/working-with-notes.md`.
- Capture proof on real data under `evidence/`.
- Open a PR (template provided). Keep the diff small enough to review.

## The one rule
Every output is **grounded + measured**. If you can't say how a change is tested and observed,
question whether it's needed.
