# Skill: evals + observability

Beacon's founding problem is *silent* failure on a laptop. The fix is two
habits: make agent output **testable** (evals) and make every run **visible**
(observability). Both land *before* the logic they cover (cadence stages 2 & 3).

## Evals: how you write "red" for non-deterministic output

You can't assert exact text. Assert properties:

- **Structure**: expected sections exist, none empty, within a word band.
- **Grounding**: every factual claim references a real artifact (commit SHA,
  PR number, message id) that appears in the source data. This is the single
  highest-value check — it's the anti-hallucination test.
- **Window/scope**: the brief only covers the requested time range / repos.
- **Safety**: no secrets, no PII that shouldn't be there, no fabricated
  numbers (cross-check any figure against source).
- **Regression set**: keep a small set of saved (input → known-good-ish
  output) cases; score new runs against the rubric so a prompt change that
  degrades quality shows up red.

Store eval sets next to the agent; run them in `npm test`. A failing eval is a
red commit like any other.

## Observability: the four signals every run emits

| Signal | Why |
|---|---|
| `agent_runs_total` (status label) | are runs happening / failing? (laptop-sleep detector) |
| `agent_tokens_total` + cost | the runaway-spend tripwire; ROI math |
| `agent_latency_ms` | is it getting slower as data grows? |
| `eval_score` | is *quality* drifting, not just liveness? |

Plus per-connector `*_requests_total` / `*_latency_ms` / `*_errors_total`.

Implementation: `pino` for structured logs, OpenTelemetry spans per run and
per tool call, a metrics facade in `src/observability/`. In the walk stage
these export to a dashboard + alerts; in crawl they're structured logs you can
grep and a printed run summary.

## The trust connection
Observability is not ops hygiene here — it's the **trust mechanism**. A
non-engineer trusts the exec brief because there's a visible record that it
ran, what it cost, what it read, and that its eval score held. "Earned trust"
in the crawl-walk-run plan is literally these signals being green over time.

## Alert, don't just measure
A metric nobody looks at is decoration. Each signal gets a threshold:
runs-failed > 0, cost-per-run above band, eval_score below floor, connector
errors spiking. Test the alert rule (it should fire on a synthetic breach)
before trusting it — an untested alert is a YAML file nobody knows works.
