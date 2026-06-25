# Evidence — connector library (W1): real calls, zero keys

**Captured:** 2026-06-24 · **Command:** `cd v1-walk && npm install && npm run connectors`
**Environment:** fresh clone, **no `.env`, no credentials** (GitHub unauthenticated; viem's public OP RPC).

## What this proves (cadence stage 5)

- **Two real, non-mocked connectors** behind one contract: GitHub (public commits API) and onchain
  (viem → OP Mainnet). Real SHAs, real block numbers — not fixtures.
- **Central auth, redacted:** GitHub resolves its (absent) token via the credential registry —
  `credential_resolutions_total{result=absent}` — and still works, because public repos need none.
  A `Secret` never reaches a log (proven separately in `test/connectors/credentials.test.ts`).
- **Discovery + live health:** `registry.list()` answers "what can Beacon read, and is it up?"
- **Uniform telemetry by construction:** `connector_requests_total` / `connector_latency_ms` were
  emitted for both sources with zero per-connector code — `defineConnector` instruments every call.
- **Interoperable with v0:** every artifact is `{kind, source, id, url, label}` — the exact shape
  v0's trust gate grounds against.

## Captured output

```
Beacon v1 — connector library (real calls, zero keys)

registry.list() — discovery + live health:
  • OK   github [read:commits] — rate-limit remaining 60
  • OK   onchain [read:blocks] — OP Mainnet head 153373469

github.fetch({ repo: "ethereum-optimism/optimism", days: 7 }) → 47 artifacts
  - cf2ce0979  docs(SDM): Add Sequencer Defined Metering (SDM) chain-operator guide (#21211)
  - 31a3f1d66  feat: add FeeVault withdrawal route setter (#20982)
  - ac9b22647  feat(kona): add kona-sp1 range-executor + SP1 execute action test (#21528)

onchain.fetch({ blocks: 2 }) → 2 artifacts
  - OP Mainnet block 153373469 — 62 txns, gas used 15456676
  - OP Mainnet block 153373468 — 58 txns, gas used 16536623

metrics snapshot (uniform, by construction):
  credential_resolutions_total{connector=github,result=absent} count=2
  connector_requests_total{connector=github} count=1
  connector_latency_ms{connector=github} count=1 avg=678ms
  connector_requests_total{connector=onchain} count=1
  connector_latency_ms{connector=onchain} count=1 avg=616ms
```

(Block numbers / commit SHAs differ per run — they're live reads. A `GITHUB_TOKEN` lifts the
unauthenticated 60-req/hr rate limit but changes nothing else.)

## The library generalizes — Slack, Notion, Monday (added later)

Three more sources landed on the same seam with **zero bespoke auth/metrics code** — just
"implement fetch + declare schema" (`src/connectors/{slack,notion,monday}.ts`). They're real API
integrations (Slack Web API, Notion search, Monday GraphQL), unit-tested offline with canned
payloads, and go live the moment a token is set. Until then the registry shows them honestly:

```
registry.list() — discovery + live health:
  OK   github   [read:commits]  — rate-limit remaining 57
  OK   onchain  [read:blocks]   — OP Mainnet head 153382832
  ···· slack    [read:messages] — no SLACK_TOKEN
  ···· notion   [read:pages]    — no NOTION_TOKEN
  ···· monday   [read:items]    — no MONDAY_TOKEN
```

In the control plane these three render with **Run disabled + "needs credentials"** (no network
call is made to probe them). Add a token (`.env`) and they go live with no new plumbing — that's the
ROI of the library, made visible.

## Tests backing this (zero-key, offline)

`npm test` → **37 passed / 1 skipped**: contract conformance, credential redaction, and every
connector's mapping logic (canned payloads) run with no network — same split as v0 (tested core +
live demo). The skipped one is the Postgres memory suite (runs when `DATABASE_URL` is set).
