# Evidence — trust gate + connector resilience (next-steps 1 & 2)

**Captured:** 2026-06-25 · **Commands:** `npm run trust`, `npm test`, live `POST /api/report`.

## Step 1 — trust-as-a-service (the exec summary must earn publication)

v0's grounding + eval gate, ported to v1's multi-source report (`src/trust/gate.ts`). The exec summary
is grounded by construction; the gate formalizes + scores that, **polices the LLM narrative**, and
**refuses to publish** on any hard violation — exactly like v0.

`npm run trust`:
```
  PUBLISHED  a grounded brief
            eval 1 (floor 0.8)
  HELD       narrative invents '40% faster' (uncited)
            eval 0.75 (floor 0.8)  ✗ fabricated figure(s) in the narrative, uncited: 40%
  HELD       a bullet cites a non-existent artifact
            eval 0.5 (floor 0.8)  ✗ grounding: 1/1 bullet(s) cite an artifact not in memory
  HELD       a bullet leaks an API key
            eval 1 (floor 0.8)  ✗ possible secret leak: api key      ← score clears the floor, still HELD
```

Live, through the control plane (`POST /api/report`, demo data):
```
published: True | eval: 1 | grounded: True (100%)
checks: {structure: True, grounded: True, noFabricatedFigures: True, noLeakedSecrets: True}
```
The page shows **✓ published · grounded 100% · eval 1** on a passing brief, and a red **"Report held —
not published"** card (with the reason) when the gate refuses. Eval-set: `test/trust/gate.test.ts` (6).

## Step 2 — connector resilience (bounded retry + rate-limit, workplan C3.1)

`src/connectors/resilience.ts`, wired into `defineConnector` so every connector gets it free. Transient
(network / HTTP 429 / 5xx) → backs off and retries; terminal (4xx, bad shape) → fails fast; an optional
min-interval throttles a rate-limited API. Emits `connector_retries_total` / `connector_ratelimited_total`.
Tested in `test/connectors/resilience.test.ts` (6): retry-then-succeed, give-up-after-budget, no-retry-on-4xx,
rate-limit spacing, and the `defineConnector` wiring.

**Full suite:** 63 passed / 1 skipped, typecheck clean.
