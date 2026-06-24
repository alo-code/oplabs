# CADENCE — how work ships here

This file is **the** contract for how work ships in this repo. Every
workplan, every slice, every bug fix follows it. No exceptions for size,
urgency, or "obvious" changes — the small ones are where regressions hide.

> **Loaded automatically**: this file is referenced from `CLAUDE.md`. When
> the cadence is mentioned, it means the five stages defined here, not
> whatever feels appropriate.

Beacon's whole reason to exist is that the org's AI workflows currently run
on one person's laptop: no shared memory, no observability, silent when the
laptop sleeps, impossible to hand to a non-engineer. A system whose job is to
make AI work *trustworthy* cannot itself be built on "the file changed, ship
it." The cadence is how a prototype earns the right to be trusted: every
change leaves an audit trail a reviewer — or a non-engineer stakeholder — can
follow.

---

## The five-stage cadence

Every change passes through five stages. **All five are required content** —
contract, failing test (red), observability, green logic, evidence — and all
five MUST be present and reviewable. The commit structure is not prescribed:
one commit per slice (with all five stages addressed in the commit body or a
referenced evidence dir) is the default. Splitting into multiple commits is
allowed when it aids review.

> The five stages are an *audit trail*, not a *commit graph*. Per-slice
> bundling preserves the discipline without ceremony. The one deployment
> exception (schema migrations) survives — see "When stages explicitly DO
> NOT collapse".

### 1. Contract

Agree the *shape* before writing the *logic*.

- **What**: the public surface the change introduces or modifies — a
  TypeScript type or interface, a connector method signature, a tool schema
  (the Zod schema an agent calls), a DB column, an HTTP route, an env var, a
  metric name, an alert rule, a runbook section.
- **Where it lives**: in the slice doc OR a contract-only commit (a skeleton
  module, an empty handler, a `zod` schema with no implementation, a doc
  page).
- **Why**: lets reviewers — and stakeholders reading `docs/` — push back on
  shape *before* implementation cost is sunk. For Beacon this is where you
  pin a connector's return type or a tool's input schema, the seam everything
  else hangs off.

### 2. Failing test (red)

Write the test that proves the system is broken (or that the new behavior
isn't there yet) **before** writing the fix.

- **What**: `vitest`, a `tsc --noEmit` type-level assertion, a k6 threshold,
  an eval-set assertion (does the agent's output meet the rubric?), or a
  documented manual reproduction with output captured.
- **Output**: a red commit with the failing test + log showing it fails — or
  the failing test bundled with the fix in one commit, with the failure
  output pasted in the commit message / evidence dir.
- **Why**: a fix without a red proof is "I think this fixes it." A bug fix
  without a regression test will be re-introduced inside a quarter. For agents
  the red is often an **eval**: pin the bad output (hallucinated field, empty
  brief, wrong week range) so the next regression is loud.

**Red is mandatory even for one-line bug fixes.** Find the cheapest test that
pins the bug. If you genuinely can't write one — that's a smell; the bug class
probably needs an observability signal (stage 3) so the next recurrence is at
least loud.

### 3. Observability added first

Before the green logic, add the metric, structured log, trace span, or alert
that will tell you whether the change works in production.

- **What**: a `pino` structured log line, an OpenTelemetry span
  (`tracer.startSpan`), a counter/gauge/histogram (token spend, run latency,
  connector error rate, eval score), OR a dashboard panel / alert rule with a
  passing rule test.
- **Where it lives**: a separate commit ahead of green, or bundled if trivial.
  The rule: when green lands, the observability is already there to receive
  it — no "we'll add metrics later."
- **Why**: Beacon's founding problem is *silent* failure. Observability-first
  means a regression doesn't go silent for 7 days. A new connector ships its
  `connector_errors_total` counter and a run-cost histogram **before** the
  fetch logic, so the first failed auth and the first runaway token bill are
  instantly visible.

For UI / control-plane work: the observability is usually a component story, a
visual baseline, or an axe accessibility violation count — same principle,
different tool. For pure refactors with no behavior change: observability is
the existing test suite — pin behavior, refactor, suite stays green.

### 4. Green logic

The actual fix or feature.

- **What**: the change that makes the red test green and (where applicable)
  emits the observability signal.
- **Constraint**: green is the last possible point at which logic enters the
  codebase. No "while I'm here" cleanups, no speculative refactors, no
  drive-by formatting. Each of those is its own slice with its own red.
- **Why**: small, focused green diffs are reviewable. Big green diffs hide
  bugs — and an LLM pair will happily generate a big green diff if you let it.
  Keeping green small is how you stay in control of AI-authored code.

### 5. Evidence

Prove the change works *outside* the test harness.

- **What**: a run log, a screenshot of a rendered brief, a metric query
  result, a manual reproduction with output, a k6 report, an eval scorecard,
  a recording of a real connector call returning real data.
- **Where it lives**: `evidence/<workplan-slug>/<slice>/README.md`, with any
  drill/replay scripts beside it so the proof is reproducible. (This repo uses
  top-level `evidence/`; the upstream template used `docs/evidence/`.)
- **Why**: "tests pass" means "the test passed." Evidence means "I ran the
  thing against real Slack / GitHub / onchain data and observed the outcome."
  For an interview reviewer and for a non-engineer stakeholder, the evidence
  dir is the part they can actually check.

`*.log` is gitignored project-wide. Captured output goes **inline** in the
evidence README. Drill **scripts** are committed.

---

## Slice template (copy into every workplan slice)

```markdown
### <slice-id> <slice-name>

- **Files**:
  - `src/connectors/github.ts` (new — what's added)
  - `src/agents/exec-brief/brief.ts` (edit — what changed and why)

- **Contract (agreed first)**: 1–3 sentences fixing the surface. Type /
  interface / tool schema / route / env var. Reviewer-actionable BEFORE any
  implementation lands.

- **Failing test (red before green)**: name the test + the assertion that
  fails today. `test/exec-brief.test.ts > builds a brief from real events`
  expects N sections; current behavior returns 0. Pin it.

- **Observability added first**: the metric / log / span / eval / panel that
  is live before green. Name it. State label cardinality if it's a counter,
  threshold if it's an alert.

- **Green logic**: 1 sentence. The fix.

- **Evidence of done**:
  - test green: `npm test` pass
  - typecheck: `npm run typecheck` clean
  - drill: `evidence/<workplan>/<slice>/README.md` with a real run capture
  - manual repro (when applicable): exact command + observed output

- **Effort**: <hours>

- [ ] Done — flips ONLY when the slice's commit(s) address all five stages
      AND evidence has landed.
```

### One commit per slice (the default)

Address all five stages (in code, in the commit body, or in
`evidence/<workplan>/<slice>/`) and commit once at the end of the slice. The
commit body must show the audit trail: what contract was agreed, what test
went red, what observability was added, what changed for green, what evidence
proves it.

A typo fix in a doc still goes through all five stages — they just collapse:

| Stage | For a typo fix (one-commit form) |
|-------|----------------------------------|
| Contract | "fix the typo" — stated in the commit subject |
| Red | a link-check / type / spellcheck that fails until fixed (or the bug ticket with the user-visible output, referenced in the body) |
| Observability | the test going green is the signal |
| Green | the typo correction (the diff itself) |
| Evidence | the test going red → green, captured in the commit body or `evidence/` |

If the change is so small you can't articulate stages 1–3, **the change might
not be needed** — re-evaluate before committing.

### When stages explicitly DO NOT collapse (the only surviving exception)

- **Schema / store migrations** — the contract (the migration) and the green
  (the code that uses the new column/index) SHOULD be separate commits so the
  migration can deploy ahead of the code that depends on it. This is a
  deployment-ordering reason, not a cadence-rigor reason; red / observability
  / evidence can ride on either commit.

All other categories — auth, money/spend, PII, feature flags, user-visible
bug fixes — MAY ship as a single commit per slice. Reviewers still expect the
five-stage audit trail in the commit body or evidence dir.

---

## Workplan structure

Workplans live at `todo/<name>.md` and are **committed** (showing the plan is
part of this repo's purpose). A workplan is a sequence of slices and MUST
contain:

1. **One-paragraph problem statement** — what's broken or missing today, in
   user-visible terms. Not "we should add X"; "X is missing and the
   consequence is Y."
2. **Sizing note** — engineer-hours/weeks, with margin for re-runs.
3. **Phase grouping** — slices grouped into phases, each with a **Phase Exit
   Gate**: a checklist of falsifiable items (a checkbox you can fail).
4. **Risk + rollback** — worst case, what we revert, in what order.
5. **Closing addendum** when complete — what shipped, what graduated to later
   workplans, what got descoped.

When a workplan completes, its durable record graduates to:

- A **Completion** addendum at the bottom of the workplan file.
- Committed proof under `evidence/<workplan-slug>/<slice>/`.
- A `CHANGELOG.md` entry under `## [Unreleased]`.

### Workplan top-of-file frontmatter

```markdown
# <Workplan Title>

**Branch**: `feat/<short-name>` (suggested)
**Drafted**: YYYY-MM-DD
**Sizing**: ~N engineer-hours
**Status**: drafted | in-progress | closed

## Problem
<One paragraph, user-visible terms.>

## Phases
- Phase X-1 — <name>
- Phase X-2 — <name>

## Cadence
This workplan follows `CADENCE.md`. Every slice ships contract → red →
observability → green → evidence. Phase exit gates do not flip until every
slice in the phase has all five stages logged. The per-slice fields are in
`todo/WORKPLANTEMPLATE.md`.
```

---

## What the cadence is NOT

- Not a checklist that adds five commits to a one-line fix because the rule
  said so. Stages collapse intelligently — see the table.
- Not a substitute for code review. Reviewers still read the diff; the cadence
  makes the diff smaller and easier to review. This matters more, not less,
  when the diff was AI-authored.
- Not a stand-in for design docs. Big architectural changes still get a doc in
  `docs/`. The contract stage references the design doc; it doesn't replace it.
- Not optional for "internal-only" or "dev-only" code. The load harness and
  eval sets go through all five stages too — that's what keeps a broken
  measurement tool from poisoning a real drill.
- Not optional for "small bug fixes." Small bug fixes are where regressions
  hide. Five stages, every time.

---

## Provenance

This cadence is adapted from a production discipline used on a polyglot
agent system (Go services + Python agents, NATS, Prometheus/Grafana), where
shipping each slice as contract → red → observability → green → evidence
caught real regressions that "the tests pass" would have missed — e.g. a
silent 45-second wait-list timeout and a deduplication-keying bug that only
an evidence drill made visible.

Two adaptations for this repo:

- **Stack**: tooling is TypeScript-native here — `vitest` / `tsc --noEmit`
  instead of `go test` / `pytest`, `pino` + OpenTelemetry instead of `slog` +
  Prometheus client. The production *vision* (see `docs/architecture.html`)
  stays polyglot — Python for eval/ML-heavy agents, a Go hot path if a
  connector needs it — behind language-agnostic seams (tool schemas, a
  message bus, HTTP). The cadence is language-agnostic by design.
- **Visibility**: the upstream template gitignored `workplans/` and committed
  only `docs/evidence/`. Here `todo/` and `evidence/` are both committed,
  because demonstrating the thinking is the point.

The inaugural application of the cadence in this repo is
`todo/exec-brief-slice.md` (the weekly exec brief). When in doubt about how to
slice something, look at how that workplan is sliced and at
`evidence/scaffold/` for how evidence is captured.
