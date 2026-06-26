# run — the vision (design-only, code later)

**Stage:** Run. **Not built yet** — design docs + diagrams; `src/` reserved.

Beacon as *how OP Labs runs AI work* — many workflows, many teams, safely.

## Scope (design)

- **Self-serve workflow creation** for non-engineers (compose connectors + prompts
  behind guardrails) — the platform stops being engineer-gated.
- **Governance** — per-workflow budgets, [access control](docs/access-control.md), audit log,
  PII / data-residency policy enforced centrally. Read-side authorization **mirrors each source's
  real ACL** (no reorg), so V3's MCP scopes every answer to what the caller may already see — V0/V1
  stay flat because they're executive/admin-only.
- **Reliability** — SLOs, on-call, graceful degradation, multi-provider model routing.
- **Polyglot where it pays** — Python (eval/ML-heavy agents), a Go hot path — behind
  the same seams, no rewrite.
- **Onchain seam** — the bridge to case-study Option 2: agents that act with value do
  so through policy-bounded, auditable spend (the same trust machinery, extended to money).

## Layout
- `docs/` — vision notes + diagrams.
- `src/` — reserved for the eventual build.
