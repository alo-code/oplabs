# CLAUDE.md — agent operating guide for Beacon

> This file is auto-loaded by Claude Code / Cursor / Codex. If you are an AI
> agent working in this repo, read this first, then `CADENCE.md`.
> (Prefer the cadence at the repo root. If you keep agent config under
> `.claude/`, point it here — there is one source of truth, not two.)

## What this repo is

Beacon is the OP Labs **case study, Option 1**: *"our AI workflows do not
scale."* Today a growing set of AI workflows (exec briefs, deal decision-log,
prospect intel, a Q&A agent) run on **one person's laptop** — context is
re-fetched per task, the system sleeps when the laptop sleeps, auth is manual
and per-source, there's no shared memory, no observability, and it can't be
handed to a non-engineer.

Beacon is the always-on platform that fixes that. The full argument lives in
`docs/` (open `docs/index.html`) — that is also the **approach document** for
the case study.

This repo is **three segregated versions** of that platform, one per crawl-walk-run
stage: `v0-crawl/` (the only one that runs — the exec brief as an **n8n.cloud workflow**
plus a tested TS **trust core**), and `v1-walk/` + `v2-run/` (design-only, code-ready for
later). Shared methodology (`skills/`, `todo/`, `CADENCE.md`, `notes.md`) and the
approach doc (`docs/`) live at the root.

## How work ships here: the cadence

**Every** change follows the five-stage cadence in `CADENCE.md`:

1. **Contract** — agree the shape (type / tool schema / route / env var) first.
2. **Red** — write the failing test/eval before the fix.
3. **Observability** — add the metric/log/span/eval signal before green.
4. **Green** — the smallest diff that turns red → green.
5. **Evidence** — prove it on real data in `evidence/<workplan>/<slice>/`.

This is not optional, including for one-line fixes. If you can't articulate
stages 1–3 for a change, question whether the change is needed.

## Repo map

```
README.md             the front door — explains the three-version layout
CADENCE.md            the contract for how work ships (read it)
WORKPLANTEMPLATE.md   per-slice + workplan fields
notes.md              raw running log of how this was built with AI (do not clean up)
skills/               AI-driven-development playbooks (shared across versions)
todo/                 workplans = ongoing/planned work (committed)
docs/                 the approach doc — navigable HTML + diagrams → GitHub Pages
                      (oplabs.daciasec.net); shared narrative across all versions

v0-crawl/                THE runnable version — n8n workflow + a tested TS trust core
  workflow/           n8n.cloud export: schedule → GitHub → Claude → render
  src/trust/          grounding + eval scoring (tested TS; mirrored into an n8n Code node)
  test/               vitest specs for the trust core
  evidence/           proof on real data (a real exec-brief run)
v1-walk/                 design-only (code later): the platform — connectors, memory, control plane
v2-run/                  design-only (code later): the vision — self-serve, governance, polyglot, onchain
```

## Conventions

- **Language**: TypeScript, ESM, Node ≥ 20. Strict mode on.
- **Validation**: `zod` for all external input (connector responses, tool
  args, env). Parse, don't trust.
- **Secrets**: only via `src/core/config.ts` (env-backed). Never inline keys;
  never log secret values.
- **Connectors** implement the interface in `src/connectors/base.ts` and own
  their auth. Adding one? Read `skills/connector-pattern.md`.
- **Agents** are tool-calling workflows over connectors + memory. Adding one?
  Read `skills/agent-pattern.md`.
- **Docs site** (`docs/`) is the approach document — co-branded static HTML, one
  stylesheet, no JS/build, opens from a fresh clone. Editing it? Read
  `skills/docs-site.md`.
- **Tests**: `npm test` (vitest), `npm run typecheck` (tsc). Both green before
  a slice is "done."

## Working with AI in this repo

Keep `notes.md` as a raw, append-only log of prompts, decisions, dead ends,
and corrections — see `skills/working-with-notes.md`. It is a deliverable, not
an afterthought; do not tidy it.

## Quickstart

```bash
cd v0-crawl
npm install
npm test            # the TS trust core (grounding + evals)
```
The full exec-brief runs as an n8n.cloud workflow — see `v0-crawl/README.md`.
