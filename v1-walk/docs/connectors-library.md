# Connectors Library — one interface, central auth, cheap to extend

**Branch**: `feat/connectors-library` (suggested)
**Drafted**: 2026-06-23
**Sizing**: ~3–4 engineer-days
**Status**: ✅ closed (thin-but-real slice — see Completion at the bottom)
**Stage**: Walk (first Walk workplan)
**Depends on**: `exec-brief-slice.md` 1.1 (config) + 1.2 (GitHub connector). This
workplan generalizes both. Does **not** depend on the Postgres memory workplan —
write-through uses the existing `MemoryStore` interface, whichever impl is wired.

## Problem

The crawl slice shipped a single GitHub connector with its own auth, parsing,
caching, and telemetry. Adding any second source (Slack, HubSpot, Notion, Drive,
Calendar, onchain) today means re-implementing all of that per source — which is
the brief's "auth is per-source and manual" pain simply relocated, plus copy-pasted
validation and metrics that will drift. Consequence: every new workflow that needs
a new source costs days and adds an un-audited credential path. Until connectors
are a library, the platform can't actually platform.

## Solution (this workplan)

Promote connectors to a library: **one interface**, a **central credential
registry** (one audited place that authenticates every source, with redaction),
and **uniform** validation / caching / rate-limiting / telemetry provided by the
framework — so a new connector is "implement `fetch`, declare your schema," a few
hours of work. Prove generality by landing two more real connectors on it.

## Phases

- Phase C1 — Connector contract + central auth (refactor, no behavior change)
- Phase C2 — Two more real connectors (prove generality)
- Phase C3 — Cross-cutting framework concerns (retry, rate-limit, registry)

## Cadence

Follows `CADENCE.md`. Every slice: contract → red → observability → green →
evidence. C1 is largely a **refactor** — for those slices the "observability"
stage is the existing exec-brief test suite staying green (behavior unchanged).

---

## Phase C1 — Connector contract + central auth

### C1.1 Connector interface v2
- **Files**: `src/connectors/base.ts` (edit)
- **Contract**: a `Connector<TParams, TResult>` interface — `name`,
  `healthcheck()`, `capabilities`, `fetch(params): Promise<TResult>` — with the
  params + result as `zod` schemas exposed on the connector (so the registry and
  agents can introspect them). This is the seam every source conforms to.
- **Red**: `test/connectors/contract.test.ts > a connector exposes schemas +
  healthcheck` — a conformance test run against any registered connector; fails
  today (interface has no schema/healthcheck surface).
- **Observability**: n/a (contract slice) — signal is the conformance test.
- **Green**: the widened interface + a `defineConnector()` helper that enforces it.
- **Evidence**: `evidence/connectors-library/C1.1/README.md` — conformance test
  green; the GitHub connector typechecks against the new interface.
- **Effort**: ~0.5d
- [ ] Done

### C1.2 Central credential registry
- **Files**: `src/connectors/credentials.ts` (new), `src/core/config.ts` (edit)
- **Contract**: `credentials.get(connectorName)` resolves that connector's secret
  (OAuth token or API key) from config/secret store, returns a typed, **redacted-
  on-log** handle. No connector reads `process.env` directly ever again. One place
  to audit, rotate, and scope every credential.
- **Red**: `test/connectors/credentials.test.ts > never serializes a secret value`
  — asserts `JSON.stringify(handle)` and log output contain no raw token; fails
  today (no redaction wrapper).
- **Observability** (before green): `credential_resolutions_total{connector,result}`
  and a `credential_missing` warn log (loud when a source is misconfigured —
  directly kills the "manual auth" silent-failure mode).
- **Green**: the registry + redacting handle + config wiring.
- **Evidence**: `evidence/connectors-library/C1.2/` — a resolve with a fake token;
  log capture showing redaction; the missing-credential warning firing.
- **Effort**: ~0.75d
- [ ] Done

### C1.3 Refactor GitHub connector onto v2 + registry
- **Files**: `src/connectors/github.ts` (edit)
- **Contract**: GitHub connector uses `defineConnector` + `credentials.get`; its
  public behavior (the `GitHubActivity` it returns) is unchanged.
- **Red**: reuse exec-brief `test/github.test.ts` — it must stay green through the
  refactor (this is a no-behavior-change refactor; the existing suite is the pin).
- **Observability**: existing connector metrics keep emitting with identical names.
- **Green**: the refactor; delete the bespoke auth path.
- **Evidence**: `evidence/connectors-library/C1.3/` — exec-brief test suite green
  before/after; a real GitHub fetch still returns real data via the registry.
- **Effort**: ~0.5d
- [ ] Done

### Phase C1 Exit Gate
- [ ] All connectors satisfy one conformance test.
- [ ] No connector reads a secret except via the credential registry (grep proof).
- [ ] No secret value can reach a log or a serialized object (test proof).
- [ ] exec-brief still produces an identical brief (no behavior regression).

---

## Phase C2 — Two more real connectors (prove generality)

### C2.1 Slack connector (real, non-mocked)
- **Files**: `src/connectors/slack.ts` (new)
- **Contract**: `Connector` returning parsed channel messages within a window
  (`{channel, days} → SlackActivity`); auth via registry; `zod`-parsed.
- **Red**: `test/connectors/slack.test.ts > returns messages in window` —
  integration test against a real workspace channel; expects ≥1 message + window
  bounds; fails today.
- **Observability**: the framework's uniform `connector_requests_total` /
  `_latency_ms` / `_errors_total{connector:"slack"}` (no per-connector code).
- **Green**: the Slack fetch + parse + write-through to memory.
- **Evidence**: `evidence/connectors-library/C2.1/` — real call, real counts,
  uniform metrics present. Read-only scopes only.
- **Effort**: ~0.5d
- [ ] Done

### C2.2 Notion connector (real, non-mocked)
- **Files**: `src/connectors/notion.ts` (new)
- **Contract**: `Connector` returning parsed pages/database rows
  (`{databaseId|pageIds} → NotionDocs`); auth via registry; `zod`-parsed.
- **Red**: `test/connectors/notion.test.ts > returns docs` — integration test
  against a real Notion db; expects ≥1 doc; fails today.
- **Observability**: uniform framework metrics, `connector:"notion"`.
- **Green**: the Notion fetch + parse + write-through.
- **Evidence**: `evidence/connectors-library/C2.2/` — real call capture.
- **Effort**: ~0.5d
- [ ] Done

> **Onchain connector (viem)** is named here as **C2.3 (optional / next)** — read
> recent transfers/events for an address via an OP-stack RPC. It's also the natural
> bridge toward case-study Option 2, so it's flagged but not sliced in this pass.

### Phase C2 Exit Gate
- [ ] Two new sources run on the library with **zero** bespoke auth/metrics code.
- [ ] Adding C2.2 after C2.1 took only "implement fetch + schema" (note the actual
      hours in evidence — this number is the ROI proof for the library).

---

## Phase C3 — Cross-cutting framework concerns

### C3.1 Retry + rate-limit + healthcheck in the framework
- **Files**: `src/connectors/runtime.ts` (new)
- **Contract**: `defineConnector` wraps every `fetch` with bounded retry +
  per-connector rate-limit + a standard `healthcheck`; connectors opt into limits
  declaratively, not by hand-rolling.
- **Red**: `test/connectors/runtime.test.ts > backs off on 429, surfaces after N`
  — fake a rate-limited source; expect bounded retries then a typed error; fails
  today.
- **Observability**: `connector_retries_total`, `connector_ratelimited_total`,
  healthcheck gauge per connector.
- **Green**: the wrapper.
- **Evidence**: `evidence/connectors-library/C3.1/` — induced 429 drill; retries
  visible; healthcheck flips red on a bad credential.
- **Effort**: ~0.75d
- [ ] Done

### C3.2 Connector registry + discovery
- **Files**: `src/connectors/registry.ts` (new)
- **Contract**: `registry.list()` returns available connectors + their declared
  param/result schemas + health. This is what the control plane (later Walk
  workplan) and a Q&A agent will read to know what's available.
- **Red**: `test/connectors/registry.test.ts > lists registered connectors with
  schemas` — expects github/slack/notion with schemas + health; fails today.
- **Observability**: `connectors_registered` gauge; healthcheck summary log on boot.
- **Green**: the registry + auto-registration.
- **Evidence**: `evidence/connectors-library/C3.2/` — registry dump with health.
- **Effort**: ~0.5d
- [ ] Done

### Phase C3 Exit Gate
- [ ] A misbehaving source degrades (retry/limit) instead of crashing a run.
- [ ] `registry.list()` is the single source of truth for "what can Beacon read,"
      with live health.

---

## Risk + rollback
- **Over-scoped / leaked credentials**: registry enforces least-privilege, read-only
  scopes, redaction (C1.2). Rollback: revoke at the source; healthcheck (C3.1) goes
  red loudly. Never store secrets outside `.env`/secret store.
- **A new connector pulls sensitive data into memory**: write-through respects the
  retention/PII hooks defined in the memory workplan (M3.3); until those land, new
  connectors store metadata + ids only, not full bodies.
- **Refactor regresses exec-brief** (C1): the existing test suite is the pin; C1 is
  no-behavior-change. Rollback: revert C1.3, keep C1.1/C1.2 (independently useful).
- **Revert order**: disable the new connector(s) in the registry → revert C3 →
  revert C1.3. C1.1/C1.2 leave the system improved and safe to keep.

## Completion

**Status: closed as a thin-but-real slice** (2026-06-25). Built in `../src/connectors/`, runnable
(`npm run connectors`), evidence in `../evidence/connectors-library/`.

- **Shipped:**
  - The connector **contract** (`base.ts` `defineConnector` — zod parse-in/out) + **uniform telemetry
    by construction** (every connector emits requests/latency/errors with no per-connector code) — C1.1.
  - **Central credential registry** (`credentials.ts`) — one audited resolve point; a `Secret` that
    refuses to serialize (proven by test). No connector reads `process.env` for secrets — C1.2.
  - **Registry + discovery + live health** (`registry.ts`, `registry-default.ts`) — C3.2.
  - **Five real connectors**: GitHub + onchain (zero-key, live) and Slack + Notion + Monday
    (token-gated) — exceeds C2's "two more"; all on the shared `{kind,source,id,url,label}` Artifact.
  - **Local auth** (beyond the original plan): in-app "Connect a service" + `./beacon setup`, over a
    shared catalog (`core/services.ts`), tokens → gitignored `.env`, live-applied.
- **Descoped / deferred:** the **C3.1 retry + rate-limit wrapper** (bounded retry, per-connector
  declarative limits) — connectors fail loud today but don't yet back off; this is the top resilience
  follow-up. "Central auth" shipped as a redacting registry, not a vault/OAuth (that's the Run stage).
- **Evidence:** `../evidence/connectors-library/` (real zero-key run + the 5-source health list).
