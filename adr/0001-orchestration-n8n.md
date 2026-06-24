# ADR 0001 — Orchestration: n8n, not custom code

**Status:** accepted · **Date:** 2026-06-24

## Context
v0 needs to run the exec brief on a schedule, pull from several sources, call a model, gate the
output, and deliver it — always-on, observable, and ideally editable by a non-engineer.

## Decision
Use **n8n.cloud** as the orchestration spine. Keep only the **trust core** (grounding + evals) as
tested TypeScript, mirrored into an n8n Code node.

## Why
- n8n removes three of the six pains *for free*: always-on (its scheduler), observability (run
  history), and non-engineer-editable (a visual workflow). Hand-rolling these is weeks of
  undifferentiated work.
- The differentiator is **trust**, so that's where the real, tested code goes.
- Build-vs-compose judgment: reach for the right tool; don't rebuild a scheduler.

## Consequences
- (+) Fastest path to a runnable, always-on slice; a non-engineer can edit the workflow.
- (+) The trust gate stays small, pure, and testable.
- (−) Logic lives in two places (TS + the Code node) — mitigated by the mirror discipline in
  `skills/n8n-workflow.md`; the tested TS is the source of truth.
- In v1 the trust core graduates from a Code node to a shared HTTP service.
