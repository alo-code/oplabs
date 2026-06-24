# Roadmap — crawl · walk · run

**Drafted**: 2026-06-23
**Status**: drafted

The case study asks for "the first version that earns trust, what comes next,
the long-term vision, and the signals that tell you it's time to move between
stages." This is that plan. The visual version is in `docs/crawl-walk-run.html`.

The guiding rule: **each stage earns the right to the next by producing a
signal, not by a calendar date.** We don't build the platform until one
workflow has proven it's worth platforming.

---

## Crawl — one workflow, end to end, trustworthy

**Goal**: replace the laptop-bound weekly exec brief with an always-on version
that pulls real data, grounds every claim, costs a known amount, and a
non-engineer can trigger and read.

**Scope**: `todo/exec-brief-slice.md`. One agent, one real connector (GitHub),
shared memory, telemetry, a schedule, a readable render.

**What "earns trust" means**: for ~3–4 weeks the brief runs on schedule with
zero silent failures, every figure traces to a source, and a non-engineer
reads it without an engineer in the loop.

### Signals it's time to move to Walk
- A second team asks "can it do *our* thing too?" (pull demand, not push).
- We're copy-pasting connector/memory/telemetry code to fake a second
  workflow — the abstraction wants to exist.
- The brief is trusted enough that someone is upset when it's late. (That's
  the real trust signal.)

---

## Walk — a platform, not a script

**Goal**: turn the one-off into reusable infrastructure so a *second* and
*third* workflow cost days, not weeks.

**Scope**:
- **Connectors** as a library (Slack, HubSpot, Notion, Drive, Calendar,
  onchain) with centralized OAuth/secret management — kill per-source manual
  auth for good.
- **Shared memory** promoted from a file to Postgres + pgvector (structured
  facts + semantic recall) so agents stop re-fetching and start sharing
  context.
- **Orchestrator** as a real service: scheduling, retries, queues, isolation
  per run.
- **Observability** to a dashboard + alerts; cost/quality SLOs per workflow.
- **Control plane v1**: a non-engineer can trigger, schedule, and read any
  workflow's output and its run history from a web UI.
- Onboard 2–3 of the existing workflows (deal decision-log, prospect intel,
  Q&A) onto the platform.

### Signals it's time to move to Run
- Non-engineers are self-serving existing workflows without filing a ticket.
- The bottleneck shifts from "can we build it" to "who's allowed to and what
  did it cost" — i.e. governance, not engineering, is the constraint.
- Several teams depend on it daily; an outage would actually hurt.

---

## Run — org-wide, self-serve, governed

**Goal**: Beacon is how OP Labs runs AI work — many workflows, many teams,
safely.

**Scope (vision)**:
- **Self-serve workflow creation** for non-engineers (compose existing
  connectors + prompts behind guardrails) — the platform stops being
  engineer-gated.
- **Governance**: per-workflow budgets, access control, audit log, data-
  residency + PII policy enforced centrally (the Security/Legal/Compliance
  partnership the JD calls out).
- **Reliability**: SLOs, on-call, graceful degradation, multi-provider model
  routing (Claude/Gemini/…) with cost/quality routing.
- **Polyglot where it pays**: Python agents for eval/ML-heavy work, a Go hot
  path for high-throughput connectors — added behind the same tool/memory
  seams, no rewrite.
- **Onchain seam** (bridge toward case-study Option 2): agents that act with
  value do so through policy-bounded, auditable spend — the same trust
  machinery, extended to money.

### Signals we're succeeding at Run
- Time-to-new-workflow measured in hours.
- Measurable org impact: hours saved/week, $ of analyst time redeployed, cost
  per workflow trending down, decisions made faster.
- AI work is boringly reliable — the interesting conversations are about what
  to automate next, not about whether the laptop is awake.

---

## Metrics that travel across all three stages
Time saved (hrs/week), cost per run + total spend, latency, eval/quality
score, adoption (active workflows · active non-engineer users), and risk
reduction (silent-failure count → 0, % outputs grounded/audited). These are
the JD's success metrics, instrumented from crawl so the ROI story is real by
the time anyone asks.
