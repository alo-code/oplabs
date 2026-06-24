# Onchain seam — the trust gate, applied to money (V2, design)

> Design-only. This is the bridge from case-study **Option 1** (internal AI workflows that scale) to
> **Option 2** (autonomous agents that transact safely onchain). They share one spine.

## The idea in one line

The same machinery that holds an **ungrounded brief** is what holds an agent's **onchain spend**: a
**policy gate before the action**, a **scoped credential to act**, and an **audit trail after**. In V0
the artifact is a sentence and grounding is *"cite a real commit."* Onchain, the artifact is a
**transaction** and grounding is *"cite a real authorization"* — a budget line, an approved
counterparty, a spend within policy.

## The parallel

| Beacon trust gate (V0, today) | Onchain spend gate (V2, design) |
|---|---|
| Every claim cites a real artifact (id / URL) | Every transfer cites a real authorization (budget line, approved payee) |
| Speculative-impact check (no invented % / ×) | Over-policy check (no spend beyond limit / allowlist) |
| Held → posted to `#beacon-ops`, not delivered | Blocked → not signed, logged for review |
| eval_score + run history (observability) | onchain receipt + audit log (inherently auditable) |
| Deterministic code (Code node) | Deterministic policy (smart-account module) |

## On the OP Stack (concrete)

- **Smart accounts** (account abstraction) — the agent acts *through a contract account*, not a raw
  key, so policy lives **in the account**, not in trust of the agent.
- **Session keys** — scoped, time- and amount-limited: "this agent may spend up to $X, to these
  payees, until T." A compromise is bounded by the key's scope.
- **Spend policy** — per-agent budgets, payee allowlists, rate limits, value caps — the analog of the
  grounding rules, enforced **before** signing.
- **Auditable settlement** — settlement is onchain, so "what did the agent spend, to whom, under what
  authorization" is answerable by construction. That's the governance the JD asks for, for free.

## The flow

```
agent intent   →   POLICY GATE   ──in policy?──┬─ yes → sign w/ scoped session key → submit to OP Stack → settle + audit
(pay X to Y)       budget · allowlist          │
                   limits · identity           └─ no  → blocked + reason logged   (the "held" path, for money)
```

Same shape as V0 (`fetch → gate → act / hold`). The gate just moved from *"is this claim grounded?"*
to *"is this spend authorized?"*

## Why this matters for OP Labs specifically

OP Labs builds the OP Stack; Option 2 is *agents that pay, settle, and coordinate onchain, safely.*
Beacon's Option-1 trust gate is the **same primitive** — so the internal platform you trust today and
the onchain product you ship tomorrow are **one system, not two**. The crawl-walk-run discipline applies
to the seam itself: **OP Sepolia testnet with tiny caps → mainnet with small policy-bounded budgets →
production** with full governance — each stage gated by a signal (e.g. an agent runs a week with zero
policy breaches before its caps rise).

## Same vs. new
- **Same:** gate-before-act, scoped capability, audit-after, a loud held/blocked path, observability.
- **New:** the artifact is a transaction; "grounding" becomes authorization; the held path is a refusal
  to sign; the audit log is the chain itself.
