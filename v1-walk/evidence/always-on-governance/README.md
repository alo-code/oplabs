# Evidence — scheduling, governance, OTel + the zero-dep demo (final three)

**Captured:** 2026-06-25 · **Command:** `./beacon demo` (fixtures + in-memory + a 20s schedule; no Docker, no keys).

## Step (scheduling) — always-on, not a button (pain ②)

`src/orchestrator/scheduler.ts`, configured by `BEACON_SCHEDULE`. `./beacon demo` sets `20s`, so the
brief re-runs on its own; the page shows a **⏱ auto-runs every 20s** pill and the run history grows.

```
$ curl /api/schedule  → enabled: True | every 20000 ms
$ (a few seconds later) → ticks: 2 | lastRunAt set: True      # it fired without anyone clicking
```

## Step (governance) — PII redaction at write time (M3.3, the Security/Legal seam)

`src/memory/policy.ts` wraps the store: emails / phones / secrets are redacted **before** anything is
stored (and a TTL can drop old items on read). A demo Slack message carries a customer email:

```
$ curl /api/memory  →  🔒 sam: Acme procurement lead is [redacted-email] — loop her in before EOW
   raw email leaked to store: 0    # the real address never reached memory
```
The page tags the item **🔒 PII redacted**. Plain numbers (onchain block heights) are left alone.

## Step (observability) — OTLP export, off by default (ADR 0003)

`src/observability/otlp.ts` — when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, metrics are POSTed as
OTLP/JSON to `<endpoint>/v1/metrics` (any Collector/SigNoz/Grafana/Langfuse ingests them). **Off by
default — zero extra containers in the demo** (`OTLP log lines: 0`). `toOtlpMetrics` shape tested.

## The demo, end to end

```
$ ./beacon demo
  ✓ up → http://localhost:7878   memory: in-memory
  ⏱  scheduler on — the brief runs every 20s without anyone clicking.
$ curl -X POST /api/report → published: True | eval: 1     # trust-gated, grounded 100%
```

**Two front doors:** `./beacon demo` (anyone, zero-dep) and `./beacon up` (Postgres e2e).
**Full suite:** 72 passed / 1 skipped, typecheck clean. Tests: `scheduler` (3), `policy` (5), `otlp` (1).
