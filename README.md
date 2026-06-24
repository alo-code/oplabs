# Beacon

**An always-on agent platform for OP Labs' internal AI workflows.**
OP Labs case study — **Option 1: "our AI workflows do not scale."**

> Codename only — rename freely. The point is the system, not the name.

Today the org's AI workflows (weekly exec briefs, a deal decision-log, prospect
intel, a Q&A agent) are stitched together by one person on a laptop. They produce
real output but don't scale: context is re-fetched per task, the system sleeps when
the laptop sleeps, auth is manual and per-source, there's no shared memory across
agents, no observability, and handing any of it to a non-engineer is hard.

Beacon turns those one-off scripts into a platform that is **always on, shares memory
and auth, is observable, and is usable by a non-engineer.**

## Start here — the approach document

Open **`docs/index.html`** (or the hosted version at **https://oplabs.daciasec.net**).
It's the approach doc for the case study — problem, proposed solution and why,
stakeholders, and the crawl-walk-run plan — with diagrams, all cross-linked.

## Three versions, segregated to show the thinking

The crawl → walk → run plan isn't just described — it's **three directories**, so you
can see the line of thinking as the system matures:

| Dir | Stage | State | What's in it |
|---|---|---|---|
| **`crawl/`** | MVP — one workflow, trusted | **Runs today** | The weekly exec brief: an **n8n.cloud workflow** + a **tested TS trust core** (real GitHub + Claude calls, not mocked) |
| **`walk/`** | The platform | Design-only (code later) | Connector library, shared memory, control plane — where we outgrow no-code |
| **`run/`** | The vision | Design-only (code later) | Self-serve, governance, reliability, polyglot, onchain seam |

Each version is its own self-contained project; `walk/` and `run/` are scaffolded
**code-ready** for when they're built.

## Run the working slice (`crawl/`)

```bash
cd crawl && npm install && npm test     # the TS trust core (grounding + evals) — no keys needed
```
Then import `crawl/workflow/exec-brief.json` into n8n.cloud, add the GitHub + Anthropic
credentials, and Run-now. Details in **`crawl/README.md`**.

> Why n8n: it removes three of the six pains by construction — always-on (its
> scheduler), observability (run history), and non-engineer-usable (a visual workflow).
> The trust core (every claim grounded in a real SHA/PR; every run scored) is kept as
> real, tested TypeScript — that's the differentiator.

## Repo layout

```
docs/        approach doc — navigable HTML + diagrams → GitHub Pages (oplabs.daciasec.net)
crawl/       the runnable version (n8n workflow + tested TS trust core)
walk/  run/  design-only versions, code-ready for later
skills/      AI-driven-development playbooks (shared across versions)
todo/        workplans — planned/ongoing work (committed; the plan is part of the deliverable)
notes.md     raw running log of how this was built with AI (a deliverable; not cleaned up)
CADENCE.md   the five-stage contract every change follows
```

## How this repo is built

Every change follows a five-stage cadence — **contract → failing test → observability →
green logic → evidence** — in **`CADENCE.md`**. It's how a prototype earns trust: each
change leaves an audit trail a reviewer or a non-engineer can follow.

## Stack & a note on language

The trust core is **TypeScript** (ESM, Node ≥ 20) for end-to-end type safety and because
the agent/MCP/onchain tooling is first-class in TS; orchestration is **n8n**. The
production vision stays polyglot (Python for eval/ML-heavy agents, a Go hot path where a
connector needs it) behind language-agnostic seams — tool schemas, a message bus, HTTP.
See the language note in `docs/index.html` and `notes.md`.
