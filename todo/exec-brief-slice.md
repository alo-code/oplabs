# Weekly Exec Brief — first working slice

**Branch**: `feat/exec-brief` (suggested)
**Drafted**: 2026-06-23
**Sizing**: ~10–14 engineer-hours for full Phase 1 (margin for re-runs).
**Demo-critical path** (the ~3h "it has to run" subset): 1.1 → 1.2 → 1.4 →
1.5 → 1.6 → 1.7. Slices 1.3, 1.8, 1.9 make it a *platform* slice; they can
follow the live demo.
**Status**: ✅ SHIPPED — but as an **n8n workflow + a tested TS trust core**
([`../v0-crawl/`](../v0-crawl/)), not the 9 pure-TS slices below. Choosing n8n removed the
scheduler / observability / non-engineer slices *for free*; the trust slices (grounding +
evals) did ship — see `v0-crawl/src/trust/`. The slice plan below is kept for the record:
how the thinking started, before the n8n pivot (which `notes.md` documents).

## Problem

The weekly exec brief today is a script on one person's laptop. It re-reads
the same sources every run, only runs when that laptop is awake, holds no
memory between weeks, emits no signal about whether it worked or what it cost,
and produces prose with no traceable grounding — so a reader can't tell a real
figure from a hallucinated one. Consequence: it's fragile, unobservable,
unauditable, and bottlenecked on one person.

## Solution (this slice)

An always-on `exec-brief` agent that pulls **real** GitHub activity for a
configured set of repos, grounds every line in a real commit/PR, writes the
brief to shared memory, emits run/cost/latency/quality telemetry, and renders
output a non-engineer can read — runnable on a schedule, not a laptop.

## Phases

- Phase 1 — Real data in, grounded brief out, observable
- Phase 2 — Earn trust (second source, week-over-week diff, alerts, control-plane page)

## Cadence

Follows `CADENCE.md`. Every slice: contract → red → observability → green →
evidence. Phase 1 exit gate does not flip until all its slices have five
stages logged + evidence under `evidence/exec-brief/<slice>/`.

---

## Phase 1 — Real data in, grounded brief out, observable

### 1.1 Config + secrets
- **Files**: `src/core/config.ts` (new)
- **Contract**: a `zod`-validated `Config` parsed from env (`ANTHROPIC_API_KEY`,
  `GITHUB_TOKEN`, `GITHUB_REPOS`, `LOG_LEVEL`, `BEACON_ENV`). Missing required
  keys fail fast with a readable message. Secrets are only ever read here.
- **Red**: `test/config.test.ts > rejects missing required keys` — expects a
  thrown validation error; today there's no parser so nothing throws.
- **Observability**: `log.info({ env, repos: n }, "config.loaded")` — never log
  secret values.
- **Green**: the zod schema + `loadConfig()`.
- **Evidence**: `evidence/exec-brief/1.1/README.md` — run with a missing key,
  capture the readable failure; run with `.env`, capture the redacted load log.
- **Effort**: ~1h
- [ ] Done

### 1.2 GitHub connector (real, non-mocked)
- **Files**: `src/connectors/base.ts` (new), `src/connectors/github.ts` (new)
- **Contract**: `Connector<GitHubActivity>` per `base.ts`; `fetch({repo, days})`
  returns parsed commits + merged PRs within the window. Implements the
  `skills/connector-pattern.md` rules (own auth, zod-parse, write-through).
- **Red**: `test/github.test.ts > returns activity in window` — hits the real
  API for `ethereum-optimism/optimism`, expects ≥1 commit and `from < to`.
  Fails today (not implemented). (Marked as an integration test; needs a token.)
- **Observability** (before green): `connector_requests_total{connector}`,
  `connector_latency_ms{connector}`, `connector_errors_total{connector}`.
- **Green**: Octokit fetch + zod parse + memory write-through.
- **Evidence**: `evidence/exec-brief/1.2/` — real call, real repo, real counts,
  latency metric snapshot. Read-only token.
- **Effort**: ~2h
- [ ] Done

### 1.3 Shared memory (store/recall + dedup)
- **Files**: `src/memory/memory.ts` (new)
- **Contract**: `MemoryStore` — `store(key, value)`, `recall(key)`,
  `seen(id)/markSeen(id)`. Crawl impl: a local JSON/SQLite file. Same interface
  the Postgres+pgvector walk impl will satisfy.
- **Red**: `test/memory.test.ts > does not re-surface seen items` — expects an
  item marked seen last run to be filtered; fails (no store).
- **Observability**: `memory_items_total`, `memory_dedup_hits_total`.
- **Green**: the file-backed store + dedup keying (keyed by source id, not
  content hash — a known footgun: content changes, identity doesn't).
- **Evidence**: `evidence/exec-brief/1.3/` — two runs; show run 2 skips items
  surfaced in run 1.
- **Effort**: ~1.5h
- [ ] Done

### 1.4 Model interface + summarizer (provider-swappable)
- **Files**: `src/core/model.ts` (new)
- **Contract**: `Model.summarize({activity, prior, rubric}) => Brief`. Vendor
  SDK lives behind this interface (Claude default; Gemini/OpenAI swappable per
  the JD). Enforces a per-call token ceiling.
- **Red**: `test/model.test.ts > refuses over-budget input` — expects a thrown
  budget error on oversized input; fails (no interface).
- **Observability**: `agent_tokens_total` + cost, `model_latency_ms`,
  `model_provider` label.
- **Green**: the interface + Anthropic adapter + budget guard.
- **Evidence**: `evidence/exec-brief/1.4/` — a real summarize call, token+cost
  snapshot.
- **Effort**: ~2h
- [ ] Done

### 1.5 exec-brief agent (compose + ground)
- **Files**: `src/agents/exec-brief/brief.ts` (new), `.../prompt.ts` (new)
- **Contract**: `defineAgent` per `skills/agent-pattern.md`; `run(ctx)` →
  grounded `Brief` (each bullet cites a real SHA/PR#). Deterministic control
  flow; model only summarizes.
- **Red**: `test/exec-brief.test.ts > every bullet cites a real artifact` —
  parses output, asserts each claim's cited id exists in the source activity;
  fails today.
- **Observability**: `agent_runs_total{status}`, `agent_latency_ms`.
- **Green**: fetch → recall → summarize → store → return.
- **Evidence**: `evidence/exec-brief/1.5/` — a real end-to-end brief from real
  repo activity, with the grounding visibly checking out.
- **Effort**: ~2h
- [ ] Done

### 1.6 Eval set (the quality "red")
- **Files**: `src/agents/exec-brief/evals/*.ts` (new)
- **Contract**: an eval suite asserting structure (sections non-empty, word
  band), grounding (100% of claims cite real ids), window correctness, and
  safety (no secrets/PII, no fabricated numbers). Produces an `eval_score`.
- **Red**: seed with one known-bad output (ungrounded bullet) → suite is red.
- **Observability**: `eval_score` gauge per run; floor threshold defined.
- **Green**: the assertions + scorer.
- **Evidence**: `evidence/exec-brief/1.6/` — eval run output; red on the bad
  sample, green on the real brief.
- **Effort**: ~1.5h
- [ ] Done

### 1.7 Telemetry wiring
- **Files**: `src/observability/{logger,metrics}.ts` (new)
- **Contract**: `pino` logger + a metrics facade exposing the counters/
  histograms/gauges named above; a printed end-of-run summary (cost, latency,
  counts, eval_score).
- **Red**: `test/metrics.test.ts > run emits required signals` — asserts the
  four agent signals are emitted for a run; fails today.
- **Observability**: this slice *is* the observability; its own test pins it.
- **Green**: the facade + run-summary printer.
- **Evidence**: `evidence/exec-brief/1.7/` — a run summary capture.
- **Effort**: ~1.5h
- [ ] Done

### 1.8 Scheduler + manual trigger (always-on)
- **Files**: `src/orchestrator/scheduler.ts` (new), `src/index.ts` (edit)
- **Contract**: register the agent on a cron (`0 13 * * MON`) and expose a
  manual `run-now`. Designed to run as a deployed service, not a laptop.
- **Red**: `test/scheduler.test.ts > triggers on schedule` — fake timers;
  expects one run per tick; fails today.
- **Observability**: `scheduler_fires_total`, `scheduler_missed_total`.
- **Green**: the scheduler + trigger.
- **Evidence**: `evidence/exec-brief/1.8/` — a fired scheduled run + a manual run.
- **Effort**: ~1.5h
- [ ] Done

### 1.9 Non-engineer render
- **Files**: `src/agents/exec-brief/render.ts` (new)
- **Contract**: render a `Brief` to (a) a clean CLI summary and (b) a static
  self-contained HTML file a non-engineer can open — including the grounding
  links and the run's cost/score footer (trust, visible).
- **Red**: `test/render.test.ts > renders grounding links` — expects every
  cited id to become a link; fails today.
- **Observability**: n/a (covered by 1.7); a render smoke counter optional.
- **Green**: the renderers.
- **Evidence**: `evidence/exec-brief/1.9/` — screenshot/output of the rendered
  brief.
- **Effort**: ~1.5h
- [ ] Done

### Phase 1 Exit Gate
- [ ] Brief generates from **real** GitHub data with zero mocks.
- [ ] 100% of brief claims cite a real artifact (eval green on a real run).
- [ ] Every run emits runs/tokens+cost/latency/eval_score, visible in the
      run summary.
- [ ] A run can be triggered on a schedule **and** manually; neither needs a
      laptop awake.
- [ ] A non-engineer can open the rendered brief and see its grounding + cost.

---

## Phase 2 — Earn trust (what comes next)

Lighter detail; sliced fully when Phase 1 closes.
- **2.1** Second connector (Notion) behind the same interface — proves the
  pattern generalizes.
- **2.2** Week-over-week diff ("what changed since last brief") using shared
  memory — the thing a laptop script can't do.
- **2.3** Alerts: run-failed > 0, cost-per-run out of band, eval_score below
  floor; test each rule fires on a synthetic breach.
- **2.4** Control-plane page: trigger + run history + last brief, for a
  non-engineer.

### Phase 2 Exit Gate
- [ ] A second workflow/source runs on the same connector+memory+telemetry
      machinery with no copy-paste.
- [ ] A non-engineer self-serves a run from the UI and reads the result.
- [ ] An induced failure pages/notifies instead of going silent.

---

## Risk + rollback
- **Token/cost runaway** (model loop or huge input): per-call budget guard
  (1.4) + cost alert (2.3). Rollback: disable the schedule (1.8), runs stop;
  no state corruption.
- **Over-scoped/leaked token**: read-only GitHub token, stored only in `.env`.
  Rollback: revoke token; connector healthcheck (1.2) goes red loudly.
- **Bad output reaches a stakeholder** (hallucinated figure): grounding eval
  (1.6) blocks ungrounded briefs; render shows sources so a reader can verify.
  Rollback: gate publish on eval_score ≥ floor.
- **Revert order**: disable schedule → revert agent (1.5) → keep connector +
  memory (independently useful). Each slice leaves the system working.

## Completion (fill when closed)
- **Shipped** / **Graduated** / **Descoped** / **Evidence**: `evidence/exec-brief/`
