# Skill: adding a connector

A connector is Beacon's adapter to one data source (Slack, HubSpot, Notion,
Drive, Calendar, GitHub, onchain). Connectors solve two of the six founding
pains: **manual per-source auth** and **re-fetching context**.

## Rules

1. **Implement the interface** in `src/connectors/base.ts`. Same shape for
   every source so the orchestrator and agents don't special-case them.
2. **Own your auth, centrally configured.** Read credentials only from
   `src/core/config.ts` (env-backed). One place authenticates each source; no
   agent ever touches a raw token. This is the fix for "auth is per-source and
   manual."
3. **Validate every response with `zod`.** External data is hostile until
   parsed. The parsed type is the connector's contract.
4. **Write through to memory; read from memory first.** A connector fetch
   should check shared memory before hitting the network and write results back
   with a fetched-at timestamp. This is the fix for "context re-fetched per
   task." Freshness policy lives with the connector.
5. **Emit observability before logic** (per the cadence): a
   `connector_requests_total` counter (label: connector), a
   `connector_latency_ms` histogram, and a `connector_errors_total` counter.
   The first auth failure and the first runaway call must be visible.
6. **Never log secret values or full payloads.** Log shapes and counts.

## Shape

```ts
import type { Connector } from "./base";

export const github: Connector<GitHubActivity> = {
  name: "github",
  async healthcheck() { /* cheap auth probe; returns ok/err */ },
  async fetch(params) {
    // 1) try memory  2) network + zod parse  3) write-through  4) metrics
  },
};
```

## Definition of done (a connector slice)
- contract: the parsed response type + the `fetch` params schema;
- red: a test that fails because `fetch` isn't implemented / returns wrong shape;
- observability: the three signals above, live;
- green: the fetch + parse + write-through;
- evidence: a real call to the real source, with real counts, in
  `evidence/<workplan>/<slice>/README.md`. (Use a read-only token.)

## MCP note
Each connector is intentionally MCP-server-shaped: a named tool with a typed
schema. That keeps the door open to (a) exposing connectors to other agents
over MCP and (b) reusing existing MCP servers instead of writing our own.
Language-agnostic seam — a Python connector could implement the same tool
contract later.
