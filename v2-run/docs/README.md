# v2-run — vision design (design-only)

> Design, not code. Where Beacon becomes *how the whole org runs AI work* — many workflows, many
> teams, safely. The binding constraint shifts from "can we build it" to **governance**.

| Pillar | Design |
|---|---|
| **Self-serve** | a workflow builder — non-engineers compose connectors + prompts behind guardrails; the platform stops being engineer-gated |
| **Governance** | a policy engine — per-workflow budgets, [access control](./access-control.md), audit log, PII / data-residency, enforced centrally (the Security/Legal partnership the JD names) |
| **Reliability** | SLOs, on-call, graceful degradation, multi-provider model routing (cost/quality) |
| **Polyglot** | Python (eval/ML agents), a Go hot path — behind the same seams, no rewrite |
| **Onchain seam** | [`onchain-seam.md`](./onchain-seam.md) — the trust gate applied to agent *spend* on the OP Stack; the bridge to case-study Option 2 |
| **Access control** | [`access-control.md`](./access-control.md) — read-side authorization: mirror each source's real ACL so V3's MCP scopes every answer to what the caller may already see (V0/V1 are exec-only, so they don't need it) |

**The through-line from v0:** the trust gate is the same primitive at every stage — it just
graduates from a Code node → a service → a governed, audited service (extended to spend).
