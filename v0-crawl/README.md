# v0-crawl — the runnable version

**Stage:** Crawl — the first version that earns trust (an n8n workflow + a tested TS trust core).
`../v1-walk/` is the runnable TS **platform**; `../v2-run/` is design-only — see their READMEs.

## What it is

The weekly **exec brief**, built as an **n8n.cloud workflow** with a small,
**tested TypeScript trust core**:

```
n8n.cloud:  Schedule(cron) → HTTP→5 sources (GitHub, Monday, Notion, Slack, Drive)
            → HTTP→Claude (grounded summary) → Code node [trust]
            → two renders: eng + BD → Slack/email      (run history = telemetry)
                                    │
src/trust/  ◄── source of truth, mirrored into the Code node ──┘
```

Choosing n8n is deliberate: it removes three of the six pains *by construction* —
always-on (its scheduler, not a laptop), observability (its run history), and
hand-to-a-non-engineer (a visual workflow they can read, trigger, and edit). The
one thing kept as real, **tested** code is the trust core, because grounded +
measured output is the whole point of the proposal.

The brief serves **both halves of the org from one grounded source**: it renders two ways —
an eng-leadership technical digest and a BD/GTM "what shipped, and why it matters to customers"
brief. The trust gate runs once on the shared brief; only render + deliver fan out. The BD
"why it matters" lines live inside the grounded brief (citing the same PRs) and are
eval-checked against speculative impact, so eng-derived claims are safe for BD to repeat.

## Layout

- `workflow/exec-brief.json` — the n8n workflow export (import into n8n.cloud).
- `src/trust/grounding.ts` — every brief bullet must cite a real artifact (any source: GitHub / Monday / Notion / Slack / Drive) present in the fetched activity.
- `src/trust/evals.ts` — structure + 100%-grounded + word-band + no-speculative-impact → an `eval_score`.
- `test/` — vitest: a known-bad (ungrounded) brief → red; a grounded one → green.
- `evidence/` — a real run on real repo data (brief + eval score + cost).

## Run it

**The trust core — runs on a fresh clone, no keys:**
```bash
cd v0-crawl && npm install && npm test
```
**The full workflow:** import `workflow/exec-brief.json` into n8n.cloud, set the
GitHub + Anthropic credentials, and Run-now (or wait for the schedule).

> **Status:** the trust core (grounding + evals) is built + tested; `npm run demo` and
> `npm run onchain` run on a fresh clone (no keys). The full exec brief runs as the n8n workflow in
> `workflow/`; the real run needs your n8n.cloud + credentials. Evidence under `evidence/`.
