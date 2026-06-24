# WORKPLANTEMPLATE

Copy this when starting a workplan in `todo/`. It encodes the structure
`CADENCE.md` requires. Delete the guidance comments as you fill it in.

---

```markdown
# <Workplan Title>

**Branch**: `feat/<short-name>` (suggested)
**Drafted**: YYYY-MM-DD
**Sizing**: ~N engineer-hours (include margin for re-runs)
**Status**: drafted | in-progress | closed

## Problem

<One paragraph, user-visible terms. Not "we should add X" — "X is missing and
the consequence is Y.">

## Phases

- Phase 1 — <name>
- Phase 2 — <name>

## Cadence

This workplan follows `CADENCE.md`. Every slice ships contract → red →
observability → green → evidence. A phase's exit gate does not flip until
every slice in it has all five stages logged.

---

## Phase 1 — <name>

### 1.1 <slice-name>

- **Files**:
  - `src/<path>.ts` (new — what's added)
  - `src/<path>.ts` (edit — what changed and why)

- **Contract (agreed first)**: 1–3 sentences fixing the surface (type /
  interface / tool schema / route / env var). Reviewer-actionable before any
  implementation.

- **Failing test (red before green)**: the test name + the assertion that
  fails today. `test/<file>.test.ts > <case>` expects X; current behavior
  returns Y.

- **Observability added first**: the metric / log / span / eval / panel live
  before green. Name it; state cardinality (counters) or threshold (alerts).

- **Green logic**: one sentence — the fix.

- **Evidence of done**:
  - `npm test` pass · `npm run typecheck` clean
  - `evidence/<workplan-slug>/1.1/README.md` with a real-data run capture
  - manual repro (if applicable): exact command + observed output

- **Effort**: <hours>

- [ ] Done — flips only when the commit(s) address all five stages AND
      evidence has landed.

### Phase 1 Exit Gate

Falsifiable checklist — every box must be truthfully checkable:

- [ ] <e.g. exec brief generates from real GitHub data with zero mocks>
- [ ] <e.g. run cost + latency visible in telemetry for every run>
- [ ] <e.g. a non-engineer can trigger a run and read the output>

## Risk + rollback

- **Worst case**: <what breaks, who notices>
- **Revert order**: <what we revert first, then next>

## Completion (fill in when Status: closed)

- **Shipped**: <what landed>
- **Graduated**: <what moved to a later workplan>
- **Descoped**: <what we cut and why>
- **Evidence**: `evidence/<workplan-slug>/`
```
