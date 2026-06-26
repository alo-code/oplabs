# Beacon

[![CI](https://github.com/alo-code/oplabs/actions/workflows/ci.yml/badge.svg)](https://github.com/alo-code/oplabs/actions/workflows/ci.yml)

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
stakeholders, and the crawl-walk-run-sprint plan — with diagrams, all cross-linked.

**For reviewers & contributors:** [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`DEMO-SCRIPT.md`](DEMO-SCRIPT.md) · [`ROI.md`](ROI.md) · [`adr/`](adr/) · `cd v0-crawl && npm run demo` (the trust gate) · `npm run onchain` (a real OP Mainnet read).

## Four versions, segregated to show the thinking

The crawl → walk → run → sprint plan isn't just described — it's **four directories** (`v0` →
`v1` → `v2` → `v3`), so you can see the line of thinking as the system matures:

| Dir | Stage | State | What's in it |
|---|---|---|---|
| **`v0-crawl/`** | MVP — one workflow, trusted | **Runs today** | The weekly exec brief: an **n8n.cloud workflow** + a **tested TS trust core** (real GitHub + Claude calls, not mocked) |
| **`v1-walk/`** | The platform | **Runs today** | Real TS: connector library (5 sources), shared memory (Postgres+pgvector), a **trust-gated** exec brief + control plane — `./beacon demo` |
| **`v2-run/`** | Org-wide, governed | Design-only | Self-serve, governance, reliability, polyglot, onchain seam |
| **`v3-sprint/`** | The vision | Design-only | Internal **MCP server** — ambient, grounded, governed access to company memory from any AI tool |

Each version is its own self-contained project. `v0-crawl/` and `v1-walk/` **run today**; `v2-run/`
and `v3-sprint/` are scaffolded **code-ready** for when they're built.

## Run any version from the repo root

**Fastest way to see it (any laptop, no Docker, no keys):**
```bash
./beacon demo     # v1 control plane with demo data + a live schedule → http://localhost:7878
```
Open the URL, click **Create Report** (it also re-runs on a schedule on its own), then `./beacon down`.
For the full real-substrate run (Postgres + pgvector): `./beacon up`. New here? The
**[Quickstart](docs/onboarding.html)** walks clone → run → connect your own services → report.

One dispatcher, `./beacon`, runs or tests any version without `cd`-ing in:

```bash
./beacon versions      # what each version is + what's runnable
./beacon test          # run every runnable version's test suite (v0 + v1)
./beacon v0 demo       # the trust gate (crawl) — no keys
./beacon v0 onchain    # a real, read-only OP Mainnet read
./beacon v1 start      # the walk platform → http://localhost:7878  (then ./beacon stop)
./beacon v1 demo       # connectors + shared-memory demos (real calls, zero keys)

# run v1 fully locally on the real substrate (needs Docker running):
./beacon up            # Postgres+pgvector + control plane on it → http://localhost:7878
./beacon down          # stop the control plane AND Postgres
```

It delegates to each version's own runner (e.g. `v1-walk/beacon.sh`, which manages the control-plane
lifecycle: `start|stop|restart|status|demo|test|logs`, plus `BEACON_DB=1` for Postgres). `v2`/`v3`
are design-only and say so.

## Run the working slice (`v0-crawl/`)

```bash
cd v0-crawl && npm install && npm test     # the TS trust core (grounding + evals) — no keys needed
```
Then import `v0-crawl/workflow/exec-brief.json` into n8n.cloud, add the GitHub + Anthropic
credentials, and Run-now. Details in **`v0-crawl/README.md`**.

> Why n8n: it removes three of the six pains by construction — always-on (its
> scheduler), observability (run history), and non-engineer-usable (a visual workflow).
> The trust core (every claim grounded in a real SHA/PR; every run scored) is kept as
> real, tested TypeScript — that's the differentiator.

## Repo layout

```
docs/        approach doc — navigable HTML + diagrams → GitHub Pages (oplabs.daciasec.net)
v0-crawl/    runs today — the n8n workflow + a tested TS trust core
v1-walk/     runs today — the platform in TS (connectors · shared memory · trust gate · control plane)
v2-run/      design-only — org-wide & governed (self-serve, governance, polyglot, onchain), code-ready
v3-sprint/   design-only — the vision (internal MCP for ambient, governed company-memory access), code-ready
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
