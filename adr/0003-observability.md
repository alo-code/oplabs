# ADR 0003 — Observability: instrument once (OpenTelemetry), choose the destination later

**Status:** accepted (instrumentation) · destination **deferred** · **Date:** 2026-06-24

## Context
v1 is a platform meant to outlive any one workflow. Its founding pain is *silent* failure (⑤), and
the case study's success metrics are LLM-shaped — cost per run + total spend, eval/quality score,
latency, % outputs grounded/audited, silent-failures → 0. Picking a telemetry *vendor* first means
re-instrumenting every time the org changes its mind, and risks shipping internal data (Slack /
HubSpot / Notion content; onchain later) to a third-party SaaS the Security/Legal seam hasn't cleared.

## Decision
Instrument **once**, behind the thin in-house facade (`src/observability/telemetry.ts`):
- **Logs → pino** (the production-grade form of the structured-JSON-to-stderr we already emit).
- **Metrics + traces → OpenTelemetry SDK**, exported as **OTLP**.
- **Routing → an OpenTelemetry Collector** — PII scrubbed *before* anything leaves the box; fan-out
  to one or many backends.
- **Agent/LLM layer → Langfuse** (open-source, self-hostable, OTLP-capable) for per-run tokens,
  cost, prompt/output traces, eval score, and grounding pass/fail — the ROI instrument the brief asks
  for. Generic infra tools model these poorly; this is a separate, complementary layer.

The **backend destination is deferred** (config, not code). Candidates, by stage:
- **Walk (now):** self-host Grafana LGTM or SigNoz via the same docker-compose as Postgres, or
  Grafana Cloud free tier for zero ops. Self-hosted Langfuse alongside.
- **Run (v2):** point the Collector at whatever OP Labs standardizes on (Datadog / Honeycomb /
  Grafana) — no agent code change.

## Why
- **No lock-in:** every candidate backend ingests OTLP, so "which service" stops being a one-way door.
- **Data residency:** OTel + self-host + Collector-side scrubbing keeps internal content inside OP
  Labs' boundary — the Security/Legal/data-residency seam the JD names.
- **Runnable bar preserved:** the facade stays the default (stderr + in-memory metrics), so a fresh
  clone runs with *no* backend. OTLP export switches on only when `OTEL_EXPORTER_OTLP_ENDPOINT` is
  set — the same "zero-key default, real when configured" pattern as file-vs-Postgres memory.

## Consequences
- (+) Agent code never imports a vendor SDK; the destination is an ops decision made later, with
  stakeholder input (what does OP Labs already run?).
- (+) LLM cost/quality is first-class from walk, so the ROI story is real before anyone asks.
- (−) Two systems to read (infra backend + Langfuse) instead of one — accepted: the LLM metrics are
  the ones the case study grades, and forcing them into an infra tool loses fidelity.
- **Follow-up:** pick the destination, add the OTLP exporter behind the facade, and a docker-compose
  entry for the chosen backend. Tracked, not built in the thin v1 slice.
