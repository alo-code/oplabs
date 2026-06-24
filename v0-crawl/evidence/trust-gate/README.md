# Evidence — the trust gate (deterministic)

`cd v0-crawl && npm run demo` runs the **same** grounding + eval logic the n8n Code node runs
(`src/trust/`, unit-tested 5/5) over one good brief and two bad ones. No API keys, no n8n — it
proves the guardrail on a fresh clone.

## Captured output (2026-06-24)

```
Beacon — trust gate (same logic the n8n Code node runs; src/trust/, tested 5/5)
========================================================================

1) A real, fully-grounded brief
   PUBLISHED  ->  #eng-updates + #gtm-shipped
   eval 1  |  grounded 100%  |  42 words

2) A brief citing a PR that does not exist (#9999)
   HELD       ->  not sent; reason posted to #beacon-ops
   eval 0.83  |  grounded 67%  |  45 words
   why held:  grounding: 1 violation(s), ratio 0.67

3) A grounded brief whose BD line invents a metric ('40%')
   HELD       ->  not sent; reason posted to #beacon-ops
   eval 0.85  |  grounded 100%  |  44 words
   why held:  speculative impact (uncited figures in a "why it matters" line): 40%

========================================================================
Deterministic: an ungrounded or speculative brief is never delivered to a stakeholder.
```

## What it proves

- A fully-grounded brief is **published** (eval 1.0, 100% grounded).
- A brief citing a PR that doesn't exist (`#9999`) is **held** — and note the score (0.83) **clears
  the 0.8 floor**, yet the *hard* grounding gate blocks it anyway.
- A grounded brief whose BD "why it matters" line invents "40%" is **held** by the speculative-impact
  gate (score 0.85 notwithstanding). This is the case that protects what gets forwarded to BD/customers.

The point: the gate is **deterministic and hard** — a decent score never overrides ungrounded or
speculative output.

> This is the *gate* evidence (deterministic, fixture-based). The **real-data** evidence — a brief
> generated from live GitHub/Monday/… activity via the n8n workflow — is captured separately once the
> workspace credentials are set. See `../../workflow/README.md`.
