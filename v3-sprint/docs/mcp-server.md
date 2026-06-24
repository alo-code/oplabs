# Beacon MCP — ambient access to company memory (V3, design)

> Design-only. The capstone of crawl → walk → run → **sprint**: every employee asks all of
> company memory in plain language, from the tool they already work in. One internal **MCP
> server**, thin over the platform v1/v2 already built.

## The idea in one line

After v2, getting an answer still means *going somewhere* — open the control plane, run a
workflow, read the output. Sprint collapses that distance: the knowledge comes to **you**,
inline in Claude Code / Cursor / Claude.ai / Slack, through one MCP server. The bottleneck v3
removes isn't trust, engineering, or governance — it's **the interface itself**.

## Why MCP

MCP is the open standard the tools OP Labs already uses speak natively (Claude Code, Cursor,
Claude.ai, and more). Exposing Beacon as an MCP server means **zero new UI to learn** — ask
where you already work — and it echoes the project's rule: *reuse open standards, don't
outsource the trust layer.* We expose our own grounded, governed server; we don't ship our
data into a generic agent.

## The tools (the contract)

| Tool | Does | Returns |
|---|---|---|
| `ask(question)` | grounded NL Q&A over shared memory + connectors | answer + **citations** (real ids / URLs) |
| `search_memory(query)` | semantic recall across everything agents have stored | ranked snippets + sources |
| `get_brief(week?)` | fetch a past / this-week exec brief without re-running it | the grounded brief |
| `list_workflows()` | what exists, last run, trust score | the workflow index |
| `run_workflow(name, args)` | trigger a workflow (governed) | run id → status |

`ask` / `search_memory` / `get_brief` / `list_workflows` are **read**. `run_workflow` is the
one **write**, and it stays behind v2 policy (see *Read-first*).

## Thin adapter — not a new system

The server is a **pass-through** — the n8n Code node's role, one layer up. It enforces
*nothing new*:

```
MCP client   →   Beacon MCP server   →   v2 governance            →   v1 platform
(Claude Code,    identity in,             access · audit · budget      connectors ·
 Cursor, Slack)  grounding out            decides allow/deny + logs    memory · trust
```

The critical design rule: **governance is the enforcement point; the MCP is not.** If the MCP
became the access layer, people would talk to it to route *around* v2 policy. So it only
carries identity in and grounded results out — every decision is still v2's, every call is in
v2's audit log.

## What's the same, what's new (the through-line)

| Same as V0–V2 | New at V3 |
|---|---|
| The trust gate — every answer cites a real artifact | The artifact is an *ad-hoc question*, not a scheduled brief |
| Deterministic: the model summarizes, code grounds | Grounding matters *more* — open NL is higher-variance, so "no grounded answer → I don't know" |
| Identity + audit (v2) decide and record | Audit is now *per query, per person*, not per workflow |
| Connectors + memory (v1) do the fetching | Fetch is driven by a live question, memory-first |

## Read-first (and the Option 2 bridge)

Sprint opens **read** broadly; **write** stays scoped and policy-gated. That's not a
limitation — it's the same gate-before-act machinery as the onchain seam: a write is an
*action*, an action is *spend*, and spend goes through policy. "Ask anything" must never
become "do anything." Read = the grounding gate; write = the spend gate
(`../../v2-run/docs/onchain-seam.md`).

## Crawl-walk-run on the seam itself
- **Start:** one team, read-only — `ask` + `get_brief` over the exec brief's memory.
- **Then:** all read tools, org-wide, per-user audit live.
- **Run:** governed `run_workflow`; writes/actions behind v2 policy → the onchain spend-gate.

Each step gated by a signal — e.g. a week of ad-hoc queries with **zero ungrounded answers
shipped** before write is opened.

## Why this matters for OP Labs specifically

A ~75-person org spends real time *finding* things — which PR shipped that, what did we tell
that prospect, where's the decision on X. Sprint turns Beacon into the answer to **"ask the
company"**: new hires onboard by asking it; "where do I find…" Slack threads drop. And
because it's the same trust spine, the internal tool you trust today and the onchain product
you ship tomorrow (Option 2) stay **one system, not two.**
