# AGENTS.md — agent operating guide for Beacon

> **Canonical and agent-agnostic.** This is the single source of truth for how work ships in
> Beacon, whatever tool you use. The tool-specific files — `CLAUDE.md` (Claude Code),
> `.cursor/rules/` (Cursor), `.github/copilot-instructions.md` (Copilot), `GEMINI.md` (Gemini) —
> are thin pointers to this file, so the guidance never drifts across tools.
>
> If you're an agent (or a human) working here: read this, then `CADENCE.md`.

## What this repo is

Beacon is the OP Labs **case study, Option 1**: *"our AI workflows do not scale."* Today a
growing set of AI workflows (exec briefs, deal decision-log, prospect intel, a Q&A agent) run on
**one person's laptop** — context is re-fetched per task, the system sleeps when the laptop
sleeps, auth is manual and per-source, there's no shared memory, no observability, and it can't
be handed to a non-engineer.

Beacon is the always-on platform that fixes that. The full argument lives in `docs/` (open
`docs/index.html`) — that's also the **approach document** for the case study.

This repo is **four segregated versions**, one per crawl-walk-run-sprint stage: `v0-crawl/` (the
only one that runs — the exec brief as an **n8n.cloud workflow** + a tested TS **trust core**),
and `v1-walk/` + `v2-run/` + `v3-sprint/` (design-only, code-ready). Shared methodology
(`skills/`, `todo/`, `CADENCE.md`, `notes.md`) and the approach doc (`docs/`) live at the root.

## How work ships: the cadence

**Every** change follows the five-stage cadence in `CADENCE.md`:

1. **Contract** — agree the shape (type / tool schema / route / env var) first.
2. **Red** — write the failing test/eval before the fix.
3. **Observability** — add the metric/log/eval signal before green.
4. **Green** — the smallest diff that turns red → green.
5. **Evidence** — prove it on real data under `evidence/`.

Not optional, including for one-line fixes. If you can't articulate stages 1–3, question whether
the change is needed.

## Repo map

```
README.md             the front door — the four-version layout
CADENCE.md            the contract for how work ships (read it)
CONTRIBUTING.md       human "start here"; DEMO-SCRIPT.md, ROI.md, adr/ alongside
skills/               AI-driven-development playbooks (shared across versions)
todo/                 workplans = planned work (committed)
docs/                 the approach doc — navigable HTML + diagrams → GitHub Pages

v0-crawl/             THE runnable version — n8n workflow + a tested TS trust core
  workflow/           n8n.cloud export + the paste-ready Code nodes
  src/trust/          grounding + eval scoring (tested; mirrored into an n8n Code node)
  src/{demo,onchain}.ts  npm run demo (the gate) · npm run onchain (a real OP Mainnet read)
  test/ · evidence/   vitest specs · proof on real data
v1-walk/              design-only: the platform — connectors, memory, control plane
v2-run/               design-only: org-wide & governed — self-serve, governance, polyglot, onchain
v3-sprint/            design-only: the vision — internal MCP for ambient, governed company-memory access
```

## Conventions

- **Language**: TypeScript, ESM, Node ≥ 20, strict mode (see `adr/0002`).
- **Orchestration**: v0 is an n8n.cloud workflow; the only real code is the **trust core**
  (`v0-crawl/src/trust/`, tested). Changing the workflow? Read `skills/n8n-workflow.md`.
- **Validation**: `zod` for all external input — parse, don't trust; the parsed type is the contract.
- **Secrets**: live in **n8n credentials** (or env) — never in the repo, the workflow JSON, or logs.
- **Connectors / agents** (v1): follow `skills/connector-pattern.md` / `skills/agent-pattern.md`.
- **Docs site** (`docs/`): co-branded static HTML, one stylesheet, no JS/build — `skills/docs-site.md`.
- **Tests**: `npm test` + `npm run typecheck` green before a change is done.

## Working with AI here

Keep `notes.md` as a raw, append-only log of prompts, decisions, dead ends, and corrections —
see `skills/working-with-notes.md`. It's a deliverable, not an afterthought; do not tidy it.

## Quickstart

```bash
cd v0-crawl && npm install
npm test            # the trust core (grounding + evals)
npm run demo        # watch the trust gate hold a bad brief
npm run onchain     # a real, read-only OP Mainnet call
```
The full exec-brief runs as an n8n.cloud workflow — see `v0-crawl/workflow/README.md`.
