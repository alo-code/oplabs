# CLAUDE.md — Beacon

> **THE TASK AT HAND (kept here on purpose so it is always in context).** This repo is the
> submission for the **OP Labs *AI Lead Engineer* case study** — a live interview deliverable.
> We chose **Option 1**. Every change must point at solving *that* problem and at the four
> deliverables below. Source: `../AI Lead Engineer - Case Study.pdf`.

## OP Labs case study — Option 1 (internal): "our AI workflows do not scale"

> *Their context (from the brief):* OP Labs builds the OP Stack — infra that lets companies like
> Coinbase, Kraken, and Uniswap run their own L2 chains. They're hiring someone to **solve
> open-ended system problems where AI agents do real work, and turn a prototype into something
> the rest of the org trusts and uses.**

**Option 1, verbatim:** *"We run a growing set of AI workflows on company data spread across
**Slack, HubSpot, Notion, Drive, Calendar, GitHub, and onchain sources**: weekly exec briefs, a
deal decision-log, prospect intel, a question-and-answer agent. Today they are stitched together
by **one person on a laptop**. They produce real output, but they do not scale: context is
re-fetched per task, the system sleeps when the laptop sleeps, auth is per-source and manual,
there is no shared memory across agents, no observability, and handing any of it to a
non-engineer is hard. How would you solve this and what is a long-term vision?"*

The **six pains** we architect against — one component per pain:
**① re-fetch · ② laptop-sleep · ③ manual per-source auth · ④ no shared memory · ⑤ no observability · ⑥ not non-engineer-usable.**

## The four deliverables (graded equally on technical judgment *and* product judgment)

1. **Approach doc** (core) — for a non-technical stakeholder: the problem, the solution and **why
   *this* over the alternatives**, the **stakeholders + how we'd gather requirements**, and the
   **crawl → walk → run** plan with **the signals that say it's time to move between stages**. → `docs/`.
2. **The architecture** — how we'd build it. → `docs/architecture.html`.
3. **A working slice, real tool calls** — the piece that best shows the approach, end to end, on
   **genuine data / onchain calls, NOT mocked**. It doesn't have to be complete; **it has to run on a fresh clone.**
4. **`notes.md`** — a raw, **un-cleaned** running log of how we worked with and orchestrated AI.

Plus a **20–30 min live presentation** (problem + assumptions, solution + why, architecture, what
we built, prototype → production + how we earn trust, stakeholders + metrics, what's next).
**What they're really evaluating:** technical judgment, judgment about **users, tradeoffs, and
what to build first** — in equal measure — and **how we orchestrate AI** (that's what `notes.md` shows).

## Where we are (build state)

- **v0-crawl** — the working slice: an **n8n workflow** + a **tested TS trust core** (grounding +
  evals), `npm run demo` (the trust gate) and `npm run onchain` (a real OP Mainnet read). Runs today.
- **v1-walk** — **being built now** as real TS (separate from v0, can interoperate): connector
  library + central auth, Postgres+pgvector shared memory, a minimal non-engineer control plane.
- **v2-run / v3-sprint** — design-only.

---

## Operating guide → see [`AGENTS.md`](AGENTS.md)

Beacon keeps **one** agent operating guide so it can't drift across tools.
**[`AGENTS.md`](AGENTS.md)** is the single source of truth for *how work ships* — read it, then
`CADENCE.md`. (The case-study brief above is duplicated into this auto-loaded file on purpose: it's
a **fixed external fact**, so it can't drift, and pinning it here guarantees the task stays in
context for every Claude Code session. The Cursor / Copilot / Gemini pointers still point at `AGENTS.md`.)
