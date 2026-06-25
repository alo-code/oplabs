# notes.md — raw running log

> Case study deliverable #4: a raw log of how I worked with and orchestrated
> AI. Deliberately NOT cleaned up. Append-only, newest at the bottom.
> Tooling: Claude (Cowork) as the pair; me driving + reviewing.

---

## 2026-06-23 — kickoff & framing

- Read the case study PDF + the OP Labs AI Lead Engineer JD side by side.
  Decision: **Option 1** (internal "AI workflows don't scale"). Reasoning: it's
  almost a literal description of the role ("turn a prototype into something
  the rest of the org trusts and uses" / "one person on a laptop"), and it lets
  me build a real, runnable slice fast.
- Had the AI summarize both docs first to make sure I framed the problem the
  way THEY framed it (their six pain points: re-fetch, laptop-sleep, manual
  per-source auth, no shared memory, no observability, not non-engineer-able).
  I'm going to architect directly against those six — one component per pain.

## 2026-06-23 — language decision (the risky one)

- JD lists Python + Golang. I'm a TypeScript engineer. Asked the AI flat out:
  "TS-only — does that look bad?"
- Landed on: TS-only is fine IF it's a *deliberate* call, not avoidance.
  Rationale I'll put in the approach doc:
  - case study says "whatever you prefer" + they grade judgment/orchestration,
    not raw coding;
  - "it has to run" → my strongest language = best odds of a clean demo in 3h;
  - agent/MCP/onchain tooling (Vercel AI SDK, MCP TS SDK, viem) is first-class
    in TS; OP ecosystem is TS-heavy;
  - end-to-end type safety (connector → memory → agent → UI) kills a class of
    bugs, which matters when handing to a non-engineer.
  - Production vision stays polyglot (Py for evals/ML agents, Go hot path)
    behind language-agnostic seams (tool schemas, bus, HTTP).
- This is itself the "tradeoff judgment" they're testing. Owning it > hiding it.

## 2026-06-23 — scaffolding the repo

- Codename **Beacon** (always-on, signal-in-the-dark vs silent laptop
  failures, observability vibe). Rename later, it's just a constant.
- First slice: **weekly exec brief**. Real data source = GitHub (Octokit) — a
  PAT read is the most reliable "non-mocked" call to demo on a fresh clone;
  Notion is the planned 2nd source. Brief → memory → telemetry → scheduled.
- Tailored the provided CADENCE template to this repo:
  - tools → TS: vitest / `tsc --noEmit`, pino + OpenTelemetry (was go test /
    pytest, slog + Prometheus client). Kept k6 for load.
  - folders → `todo/` (was gitignored `workplans/`) and top-level `evidence/`
    (was `docs/evidence/`). Committing both — the thinking IS the deliverable
    for an interview, so visibility beats the upstream "workplans are local"
    rule.
  - provenance: did NOT fabricate a fake multi-day history. Kept the *origin*
    (a real polyglot system's discipline) but pointed "when in doubt" at the
    inaugural workplan `todo/exec-brief-slice.md` + `evidence/scaffold/`.
    Honesty > a cool-sounding but invented changelog.
- Asked the AI to keep `agents`/`connectors`/`memory`/`orchestrator`/
  `observability` as the seam names so the directory tree itself reads as the
  architecture.

### commands run while scaffolding
```
mkdir -p beacon/{skills,todo,evidence/scaffold,docs,src/{core,connectors,memory,agents/exec-brief,orchestrator,observability},test}
node --version   # v22.x
npm install      # (see evidence/scaffold/README.md for result)
npm run typecheck
npm test
```

### deliberate scaffold scope
- src/ is typed *contracts + stubs* only. NO agent logic yet — that lands via
  the cadence (contract → red → observability → green → evidence) in the
  exec-brief workplan. A scaffold that pre-implements the slice would skip the
  red stage, which is the whole point.
- Smoke test pins a pure util (`weekRange`, the brief's reporting window) so
  `npm test` is green on a fresh clone with zero keys.

## open questions / TODO for myself
- [ ] Confirm which GitHub org/repos the brief should cover for the demo
      (default in .env.example = ethereum-optimism/optimism).
- [ ] Memory in crawl stage: SQLite file vs Postgres+pgvector in a container?
      Leaning SQLite for the slice, Postgres in the "walk" stage.
- [ ] Pick the model: Anthropic default; keep provider behind a thin interface
      so it's swappable (JD mentions Gemini + Claude).
- [ ] Decide the non-engineer UI surface for the demo: a CLI-rendered brief +
      a static HTML render is probably enough for crawl; real control plane is
      "walk".

## 2026-06-23 — branded docs site + a skill to maintain it

- Decided the approach doc should be a real multi-page site, not prose. Pulled OP
  Labs branding from oplabs.co: Optimism red **#FF0420**, Inter, the tagline "Scale
  Ethereum, Build Optimism." Chose to **co-brand** (Beacon × OP Labs), not fake an
  official OP Labs skin — it's my proposal in their visual language, and saying so is
  the honest framing.
- Asked the AI to lay out the diagram options. Picked **hand-authored SVG, no JS, no
  build step** so the site opens from a fresh clone by double-clicking the HTML
  (`file://`) with no server/network. Mermaid/a CDN would've been easier to edit but
  breaks the "runs on a fresh clone" rule offline. Owning that tradeoff explicitly.
- The fix for "SVG is tedious to edit": a shared `docs/assets/beacon.css` whose brand
  palette cascades **into** the SVGs via `.d-*` classes (no hex in any diagram), plus a
  `skills/docs-site.md` playbook with a page scaffold + SVG building-blocks. So
  hand-authoring becomes templating on a grid, and a brand change is one `:root` edit.
- Scope: lean **4 pages** — Overview, Problem map, Architecture (new), Roadmap (new).
  The last two were broken nav links before today. Refit the 2 existing pages onto the
  shared stylesheet; standardized the near-miss `#FF0421` → official `#FF0420`.
- Folded prior planning in: the **75-person** stakeholder split (half sales/BD) + the
  two-track survey and `reach×freq×pain÷effort` scoring now live on Overview; the survey
  result (prospect intel = #1 Walk fast-follow) is reflected on the Roadmap.
- Wired the new skill into `skills/README.md` + `CLAUDE.md`. Still pure-static; `npm`
  side of the repo untouched.

## open questions / TODO (docs)
- [ ] When the exec-brief slice runs for real, add a 5th **"Working slice"** page with
      the actual rendered brief + evidence (cost/latency/eval score, grounding links).
- [ ] Optionally vendor a Riforma-alike grotesque (or licensed Riforma LL) into
      `assets/fonts/` for a pixel-identical, cross-platform match. Today `--font` is
      a Swiss-grotesque system stack (offline, no CDN) — good, but OS-dependent.

## 2026-06-23 — brand pass to match oplabs.co

- Feedback: font more sophisticated like oplabs.co; pull back the red (their site is
  mostly black/white); drop the red dot on the Beacon wordmark; set "Beacon" in the
  same italic as their "OP".
- Found their actual font by `curl`'ing oplabs.co (WebFetch strips CSS): **Riforma LL**
  (`RiformaLL-Regular/Bold.woff2`), a Lineto Swiss grotesque — licensed, so not
  redistributable. Approximated with a Helvetica-Neue-led system stack in `--font`;
  left a one-token swap to drop in real Riforma later.
- Repalette: `--ink` (near-black) is now primary; **red is a sparing accent** only
  (link hover, `.note.red`, ≤2 `.d-red` highlights/figure). Diagram emphasis
  (`.d-box.accent`) + all flow arrows went red → black; roadmap stages went
  red/gray/green → a black→gray ramp.
- Removed every `<span class="mark">` dot (nav + footer + OP chip); `.brand` /
  `.foot-brand` now italic; nav active state is mono. All CSS, still offline/no-JS.
- Synced `skills/docs-site.md` (brand rule + scaffold) — it had stale "Inter" + "red mark".

## 2026-06-24 — restructure to 3 versions + crawl trust core

- Promoted beacon/* to repo root; created crawl/walk/run; git init; pushed to
  github.com/alo-code/oplabs. Enabled Pages (main /docs, CNAME oplabs.daciasec.net).
- User then renamed the dirs: crawl→v0-crawl, walk→v1-walk, run→v2-run. Adopted it;
  aligned every path ref in README / CLAUDE.md / version READMEs.
- Built the crawl trust core (TDD): src/trust/{schema,grounding,evals}.ts + tests.
  grounding = hard gate (every bullet must cite a real SHA/PR; short-SHA prefix match);
  evals = weighted score that HARD-FAILS any ungrounded brief regardless of score.
  typecheck clean, 4/4 vitest green. Pure functions (no runtime deps) so they mirror
  verbatim into the n8n Code node; zod only at the parse boundary.
- npm install hit a sandbox limit (esbuild postinstall can't spawn sh) but vitest ran
  and tests passed — clean install on a normal machine.
- Next: the n8n workflow (workflow/exec-brief.json) + a real run for evidence/.

## 2026-06-24 — v0 design: one brief, two framings

- Q (from review): v0 only fetches GitHub — is it an exec summary for BD on what the
  devs are up to?
- Decision: v0 brief = ONE grounded brief, rendered TWO ways — an eng-leadership technical
  digest AND a BD/GTM "what shipped + why it matters to customers" brief. Bridges the two
  halves of the org (~half eng / half BD); serves the under-served BD side even in crawl;
  stays GitHub-grounded.
- Architecture impact: the trust core (grounding + eval) is UNCHANGED — it gates the single
  grounded brief; render/deliver fan out downstream. Two audiences, one gate.
- Safety: the BD "why it matters" lines live INSIDE the grounded brief (cite the same PRs);
  the eval flags speculative impact (no "40% faster" unless it's in the cited artifact).
  That's what makes eng-derived claims safe for BD to repeat — the trust core earning its keep.
- GitHub-only stays a crawl constraint; a 2nd source (HubSpot / deal context) is walk.

## 2026-06-24 — v0 goes multi-source (low-lift via n8n)

- Q (review): GitHub-only feels thin — can we add Monday/Notion/Slack/Drive for a fuller
  update without blowing scope? Answer: yes — n8n makes it low-lift (native nodes) AND the
  trust core is source-agnostic, so a new source enlarges the citable pool, not the code.
  Refines the earlier "GitHub-only crawl constraint" → "grounded + contained", not literally
  one source.
- Decision: v0 pulls GitHub + Monday + Notion + a curated Slack channel + a Drive folder.
  Guardrails: Slack = ONE channel, Drive = ONE folder; every artifact citable by id or URL.
  Honest caveat: the real RUN now needs 5 creds + real data; first evidence run can use
  whatever subset is ready (GitHub guaranteed; workflow degrades gracefully).
- Built (TDD, green): generalized the trust core to multi-source — Artifact is now
  {kind, source, id, url, label}; grounding matches by exact id, short-SHA prefix, OR URL.
  Added BD-safety: BriefBullet.whyItMatters + an eval check that HARD-FAILS a grounded brief
  if a "why it matters" line invents a %/× figure not in a cited artifact. typecheck clean,
  5/5 vitest green.
- Next: the n8n workflow (5 fetch nodes → Claude → trust Code node → 2 renders → 2 channels).

## 2026-06-24 — authored the n8n workflow

- Built v0-crawl/workflow/: exec-brief.json (15-node graph, validated as JSON) + paste-ready
  Code nodes — trust-node.js (faithful mirror of the tested src/trust/), build-activity.js,
  render-eng.js, render-bd.js — + a production runbook (README.md).
- Honest boundary (told the user up front): I can't run/verify it in their n8n.cloud or handle
  credentials. Code nodes ship as fail-loud placeholders (throw until pasted). `node --check`
  flags the top-level `return` — that's the n8n Code-node contract (valid in n8n), not a bug;
  the gate logic is verified via the TS tests (5/5).
- 5 sources wired: GitHub enabled; Monday/Notion/Slack(1 ch)/Drive disabled-until-configured
  (degrades gracefully). One grounded brief → trust gate → two framings → two Slack channels.
- Next: user imports → pastes 4 Code nodes → adds 6 creds → runs (Test workflow) → we capture
  evidence/ from the real run; I debug from whatever it produces.

## 2026-06-24 — guardrail demo + onchain V2 sketch

- Demo ("demo the guardrail"): added `npm run demo` (src/demo.ts) — runs the SAME tested trust logic
  on a good brief + two bad ones, no n8n/keys, on a fresh clone. Output: good → PUBLISHED (eval 1.0);
  fake PR #9999 → HELD (grounded 67%); BD line inventing "40%" → HELD (speculative). Each held for
  exactly one reason, and the HARD gate blocks #2/#3 even though their scores (0.83, 0.85) clear the
  0.8 floor — the "a brief that scores 0.85 is still refused if it invents a metric" line. Captured to
  evidence/trust-gate/. Added tsx for the script.
- Onchain V2 sketch (the OP-specific differentiator → bridges to Option 2): v2-run/docs/onchain-seam.md
  — same gate-before-act + audit-after machinery applied to agent SPEND on the OP Stack (smart accounts,
  session keys, spend policy, auditable settlement). Grounding ↔ authorization; speculative ↔ over-policy.
- Added an eval · grounded% · artifacts footer to render-eng.js so run metrics show in the digest.
- Still pending (needs the user's n8n.cloud + creds): the REAL-data run + its evidence.

## 2026-06-24 — contributor enablement + workplan reconciliation (todo items 2/3/4)

- Reconciled stale workplans: `git mv` connectors-library.md + shared-memory-postgres.md from
  todo/ → v1-walk/docs/ (they were always v1 design); marked exec-brief-slice.md SHIPPED (built as
  n8n + trust core, not the original 9 TS slices); refreshed todo/README to the v0/v1/v2 reality.
- Contributor entry points: CONTRIBUTING.md (human "start here") + skills/n8n-workflow.md (the gap —
  how to change the workflow incl. as a non-engineer, and keep the trust gate in sync with src/trust)
  + a PR template under .github/.
- Fleshed v1-walk/docs/README + v2-run/docs/README (the four-pillar designs, concise) and wrote
  DEMO-SCRIPT.md (the 20–30 min talk track: open on `npm run demo`, close on the onchain bridge).
- Kept all of it tight (post-concision-pass discipline).

## 2026-06-24 — brownie points (onchain · CI · trust-gate safety · ROI/ADRs)

- **Onchain (verified real):** src/onchain.ts + `npm run onchain` — a READ-ONLY viem call against
  OP Mainnet (no keys, no transaction). Pulled real block 153361916 (16 txns). It's a 6th groundable
  source (kind "onchain") AND the V2 spend-gate made concrete (ALLOW/BLOCK vs a budget + allowlist).
- **Trust gate deepened:** added a secret/PII-leak HARD gate to evals.ts (+ mirrored to trust-node.js)
  and a labeled eval-set regression test (good→publish, fake-PR→held, invented-metric→held,
  leaked-secret→held; one case cites the onchain artifact). typecheck clean, 9/9 tests.
- **CI:** .github/workflows/ci.yml runs typecheck + tests on push/PR; README badge added.
- **ROI + ADRs:** ROI.md (~40× buy-in math) + adr/0001 (n8n-vs-custom) + adr/0002 (TS); README links them.
- The real n8n run is still the only thing needing the user's n8n.cloud.

## 2026-06-24 — made the repo agent-agnostic

- Q: is this repo agent-agnostic (Codex vs Claude vs ...)? Investigated: content was portable
  (skills/, CADENCE, CONTRIBUTING are plain md) but only Claude Code auto-loaded CLAUDE.md — and
  CLAUDE.md *falsely* claimed Cursor/Codex auto-load it.
- Fix: **AGENTS.md** is now the canonical guide (the cross-tool standard). CLAUDE.md, GEMINI.md,
  .cursor/rules/beacon.mdc, and .github/copilot-instructions.md are thin pointers to it — DRY, no
  duplicated content to drift; each tool auto-loads its pointer → same guidance everywhere.
- Corrected stale conventions while porting (secrets live in n8n credentials, not a
  src/core/config.ts that never existed after the n8n pivot).

## 2026-06-24 — added v3-sprint (internal MCP) as the new capstone

- Q (from the user): could there eventually be a v3 that's an internal MCP for the team — so
  every employee can query all company info naturally? Talked it through first, didn't just build.
  Landed on: yes, and it's a *separate* v3, not folded into v2. Reasoning: each stage proves one
  thing; v2 proves governed self-serve; bolting "ambient access for everyone" onto v2 muddies that
  signal. And the MCP is only safe to open broadly *after* v2's access-control + audit exist — so
  it genuinely depends on v2. The metaphor extends cleanly: crawl → walk → run → **sprint**.
- The framing that stuck: the bottleneck *moves* — laptop/trust → eng-capacity → governance →
  **reach (the interface itself)**. After v2 you still have to *go somewhere* (a workflow, the
  control plane) to get an answer; v3 makes the knowledge come to you, inline in Claude Code /
  Cursor / Claude.ai / Slack.
- Guardrail I wrote down so it can't drift: the MCP is a **thin pass-through** — identity in, v2
  governance decides, grounding holds. Governance is the enforcement point, the MCP is NOT — else
  people query around policy. Read opens broadly; write/actions stay policy-gated → that's literally
  the onchain spend-gate (the Option 2 bridge), same trust spine.
- Scaffolded `v3-sprint/` like v1/v2 (design-only): README + docs/README + docs/mcp-server.md (the
  real design doc — tools contract, thin-adapter flow, same-vs-new table, read-first, crawl-walk-run
  on the seam itself) + reserved src/. Added v3 across the docs site: versions.html (summary table,
  the 4-up "how to read" cards, a per-axis comparison column, a new per-version section + an
  MCP-over-platform SVG), crawl-walk-run.html (redrew the ascending-stages diagram for 4 boxes,
  re-gated Run → Sprint, added the Sprint stage + signals), architecture.html (Sprint column + a
  forward-link on the "MCP-shaped" card), index.html (the plan-in-one-line). Kept the rest in sync
  (README, AGENTS, todo/roadmap, CHANGELOG) — the repo's whole point is no drift.
- Relabeled v2 "the vision" → "org-wide & governed" so there's a single end-state vision (v3).
- CSS: added `--gray-4` (ramp continues — furthest out = lightest), `.stage-sprint`, `.grid-4`.
- Honest note: v3 is **design-only** — no MCP code yet. It's the direction, gated on v2 existing.

## 2026-06-24 — kickoff: actually build v1 (walk) as real TS

- Interviewed myself (via the AI) on scope before writing code. Decisions: **keep v0 as the n8n
  workflow + trust core** (don't rewrite it); **build v1 as real TS, as a separate showcase** that
  can interoperate with v0. v1 depth = **thin but real slice** (connector library + central auth,
  Postgres+pgvector memory, a minimal control plane). Runnable bar = **zero-key tests + keyed real
  run** on a fresh clone. Live creds today: **only n8n** — so the two genuinely-real connectors will
  be GitHub *public* repos (no token) + OP Mainnet onchain reads (no key); the rest get the same
  interface and run when creds land.
- Pinned the case study (Option 1 + the 4 deliverables + the 6 pains) into `CLAUDE.md` on purpose,
  so the task is always in context for every session. It's a fixed external fact → can't drift.
- Built v1-walk W1.1 + W1.2 (TDD, green): the connector contract (`defineConnector` — parse-in /
  parse-out via zod) + a registry (discovery + live health); a dependency-free telemetry facade
  (logs→stderr + in-memory metrics) wired into *every* connector by construction; a central
  credential registry whose `Secret` refuses to serialize (redaction proven by test). 11/11 vitest,
  typecheck clean. Reused v0's `{kind,source,id,url,label}` Artifact shape so v1 connectors are
  groundable by v0's trust gate — the "separate but interoperable" point, concretely.

## 2026-06-24 — observability: decided, deferred the destination

- Q (me): what service for logging/telemetry throughout? Talked it through instead of just picking.
  Landed on: **don't pick a vendor first — pick a wire format.** Instrument once with
  **OpenTelemetry + pino**, plus **Langfuse** for the LLM layer (tokens/cost/eval/grounding — the
  case study's metrics are LLM-shaped), all behind the facade I already built so agent code never
  imports a vendor. Destination = config (Collector), staged crawl→walk→run, self-host favored for
  data residency (internal Slack/HubSpot/Notion content shouldn't leave OP Labs' boundary un-scrubbed).
- Chose to **note the decision and move on** rather than wire a backend into the thin slice (would
  break the zero-key fresh-clone bar). Captured as `adr/0003-observability.md`; OTLP export is a
  tracked follow-up, not built now. The facade stays the seam.

## 2026-06-24 — v1 W2 (shared memory) + W3 (control plane), both runnable

- **W2 — shared memory (TDD, green):** one `MemoryStore` interface, two impls — `InMemoryStore`
  (zero-key default) and `PostgresStore` (Postgres + pgvector via docker-compose) — held to the
  *same* contract suite (Postgres branch skips without `DATABASE_URL`, so a fresh clone stays green).
  Dedup keyed by `(source, sourceId)` not content (carried v0's footgun note). Semantic recall via a
  swappable `Embeddings` interface; shipped a dependency-free LOCAL lexical stand-in so recall works
  offline — honest that it's lexical, not semantic (real provider drops in when keyed). `npm run
  memory` proves it on real data: agent "exec-brief" writes 47 real commits, re-run dedups all 47,
  agent "qa-probe" reads them back via semantic recall — pain ④ fixed, concretely.
- **W3 — control plane (TDD, green):** a zero-dependency `node:http` server + one self-contained HTML
  page (no build, no framework) — connectors + live health, Run-now, recent shared memory, run
  history, metrics. Extracted `executeRun` so the run logic is unit-tested offline (unknown connector
  / connector error → a summary, never a crash). Booted it and exercised every endpoint via curl:
  real onchain run (2 OP Mainnet blocks) + real GitHub run (47 commits) stored + visible in history.
  Pain ⑥ fixed. Evidence in `v1-walk/evidence/{shared-memory,control-plane}/`.
- Net: the thin-but-real v1 slice runs end to end on a fresh clone with zero keys — connectors →
  shared memory → a non-engineer page — and every artifact stays groundable by v0's trust gate.
  30 tests (29 + 1 skipped Postgres), typecheck clean.

## 2026-06-25 — onboarding: one script to start/stop/restart

- Ran the two demos live again (fresh data: block 153380876, 47 commits) to confirm.
- Wrote `v1-walk/beacon.sh` — one entry point for onboarding devs: `start|stop|restart|status|
  demo|logs`. Backgrounds the control plane with a pid file + health-wait; `stop` also frees the
  port via lsof (the node child of npm can outlive the npm pid). `BEACON_DB=1` brings Postgres up/down
  with it. Mirrored as `npm start|stop|run restart|run status|run demo`. Verified the full lifecycle
  (start → status → restart → a real API run → stop, port freed). gitignored the pid file.
- Added a repo-root `./beacon` dispatcher so any version runs/tests from the root without cd-ing in:
  `./beacon versions|test|status|stop`, `./beacon v0 test|demo|onchain`, `./beacon v1 <lifecycle>`.
  It delegates to each version's own runner (v1 → `v1-walk/beacon.sh`); v2/v3 print a design-only
  notice. Verified across versions (v1 start/status/stop + a real v0 onchain read). Documented in the
  root README.

## 2026-06-25 — run all locally (v1 on real Postgres+pgvector)

- Goal (user): run v1 fully locally on the real substrate, one command. Added `./beacon up` / `down`.
- **Hardened the Postgres impl** before it ever ran for real: the INSERT needed explicit `$5::jsonb`
  and `$6::vector` casts (bind params arrive as text). Good thing — this path had only ever been the
  *skipped* contract suite.
- **Caught a lifecycle bug in my own script** while proving it: `up` was "start if not running", so a
  stale in-memory control plane got reused instead of switching to Postgres (status still said
  in-memory; the API run wrote to the wrong process). Refactored `beacon.sh` to manage the **server**
  and the **DB** separately: `restart` bounces only the server onto the current DB (never tears
  Postgres down), and root `./beacon up` = `BEACON_DB=1 restart`. Re-proved clean.
- Docker daemon (colima) wouldn't boot — stale Lima disk lock ("attach disk … in use"); `colima stop
  -f` + `colima start` fixed it. (Left colima running.)
- **Proof:** `./beacon up` → `status` reports `postgres+pgvector`; two real page-API runs persisted
  47 github + 3 onchain rows **in Postgres** (queried the DB directly); full suite **34/34** with
  `DATABASE_URL` set (the Postgres contract suite no longer skips). Evidence:
  `v1-walk/evidence/local-postgres/`.

## 2026-06-25 — control-plane UI: "looks like mock data" → prove it + style it

- Feedback (user, w/ screenshot): the page looks like mock data; style it. Fair — two causes:
  (1) "Run history: no runs yet" sat next to populated memory because run history was in-process and
  got wiped by the `./beacon up` restart while Postgres kept the memory → reads as fake;
  (2) wireframe-plain styling.
- Fixes: **persisted run history** to `control-plane-runs.json` (survives restarts; loaded on boot,
  saved per run). **Every memory item is now a real link** to its GitHub commit / Etherscan block —
  click-through is the proof it's live, not mocked. Full visual pass (page.ts): OP-accented top bar
  with a live dot, connector cards w/ health dots, stat tiles (calls / avg latency / items stored),
  two-column memory + run history with source badges + relative times, a run toast, and a 7s
  auto-refresh. Still zero-dep (no framework/build). Verified: restart serves it, runs persist,
  a re-run of GitHub shows 0 new / 47 dedup — durable real data, not a fixture.

## 2026-06-25 — three more connectors (Slack, Notion, Monday) — the library pays off

- Added Slack (Web API), Notion (search), Monday (GraphQL) as real connectors. The whole point: each
  was just "implement fetch + declare schema" on the existing seam — central redacted auth, uniform
  telemetry, registry/health, and the control plane all came for free (Phase C2 of the workplan).
- Only n8n creds exist today, so they're built to **degrade honestly**: no token → healthcheck says
  "no SLACK_TOKEN" (no network call, no log spam, `required:false` so no warn), fetch throws a clear
  error. On the control plane page they render with **Run disabled + "needs credentials."** Targets
  (Slack channel / Monday board) default from env so the generic Run works once keyed; Notion needs
  only a token. All wired into a single `defaultRegistry()` the demo + control plane share.
- Refactored the shared `FetchLike` into `connectors/http.ts`; unit-tested all three offline with
  canned payloads (mapping + not-configured health). typecheck clean, **37 passed / 1 skipped**.
- `registry.list()` now shows 5 sources (2 live zero-key, 3 token-gated) — the discoverability story.
  When OP Labs hands over real Slack/Notion/Monday tokens, they light up with no new plumbing.

## 2026-06-25 — a multi-source demo runthrough (mock, but honest)

- User wants to show, in the demo, a Slack message + a Monday change + a Notion update flowing in.
  No tokens yet → built it as **replay**: recorded fixtures (`src/connectors/fixtures.ts`) run through
  the REAL connector mapping, grounding, dedup, shared memory, and control plane. Labeled "demo data"
  everywhere (a red pill on the page, a line in every demo output). GitHub + onchain stay live. This
  keeps the case study's "real tool calls" integrity — the *pipeline* is real, only 3 API payloads
  are canned, and I say so.
- `npm run scenario` (`./beacon scenario`): narrates the three events being ingested, then a single
  semantic query answers ACROSS slack/monday/notion/github/onchain — the "one shared source of truth"
  payoff. Also shows idempotent dedup on re-run (pain ①). `BEACON_FIXTURES=1 ./beacon up` runs the
  control plane with all 5 sources healthy so they're clickable on the page.
- Avoided a trap: our store dedups by id (no upsert), so I framed the events as NEW activity rather
  than in-place edits, which the read-only + dedup model represents honestly. Tested the fixture
  registry + mapping (`test/connectors/fixtures.test.ts`). typecheck clean, 39 passed / 1 skipped.

## 2026-06-25 — one "Create Report" button → the executive summary on the platform

- User: the page should have ONE "Create Report" button that fetches everything, shows loading,
  updates the events, then writes the exec summary. We were ~70% there (connectors/run/memory/feed
  existed); missing a "run all" action + the summary itself (which until now only lived in v0's n8n).
- Built `src/agents/exec-summary/summary.ts` — the exec brief, now produced on v1 from MULTI-SOURCE
  shared memory. Key trust property: the structured report is **grounded by construction** (every
  bullet IS a real artifact with id+url — nothing to hallucinate). Provider-swappable like the
  embeddings: `LocalSummarizer` (deterministic, zero-key, the default) vs `ClaudeSummarizer` (adds a
  narrative over the same grounded sections when ANTHROPIC_API_KEY is set; the model never invents —
  it only writes prose over real artifacts, and a failed call falls back to the grounded structure).
- Two endpoints: `POST /api/run-all` (fetch every HEALTHY source) + `POST /api/report` (summarize
  from memory); both persisted. Rewrote the page: replaced per-source Run buttons with one red
  **Create Report** CTA that stages ① fetch → ② refresh feed → ③ summary, with a spinner + status.
  Report renders as themed sections (Shipped/GTM/Deals/Docs/Onchain), each line a link to its source.
- This closes a nice loop: v1's platform now produces the case study's headline workflow (the weekly
  exec brief) from many sources, where v0 did it from one. Tested the report builder
  (`test/agents/exec-summary.test.ts`). typecheck clean, **43 passed / 1 skipped**.

## 2026-06-25 — onboarding: a Quickstart doc + in-app "Connect a service"

- User: an onboarding flow in the docs (clone → running locally) + "really cool if users could
  authenticate to their services once running locally."
- **Auth choice:** full OAuth per service needs each user to register OAuth apps — wrong for a local
  dev tool. The realistic "authenticate locally" for these APIs is paste-a-token, with a link to
  where to get each. Built that; noted production evolves to OAuth + a vault behind the SAME registry.
- **In-app connect:** a "+ Connect a service" modal in the control plane. Paste a token
  (Slack/Notion/Monday/GitHub/Anthropic, each with a help link + the right fields) → `POST /api/connect`
  → writes to a gitignored `v1-walk/.env` AND live-updates `process.env`, then re-probes health — the
  source flips OK with no restart. Found+fixed a latent gap: the app never actually loaded `.env` —
  added `src/core/env.ts` (loadEnv/upsertEnv), wired into the server + demos, so hand-editing works too.
- **Security:** the server now binds `127.0.0.1` (it writes secrets); logs record only the var NAMES
  set, never values; the modal states local-only/gitignored/prod-uses-a-vault. Verified: connecting a
  fake Slack token re-probed REAL Slack → `invalid_auth` (proves it authenticates for real), `.env`
  written, no token in logs. typecheck clean, **46 passed / 1 skipped**.
- **Docs:** `docs/onboarding.html` (Quickstart) per the docs-site skill — clone → `./beacon up` →
  connect services → Create Report, with a flow SVG + a per-service token table; added "Quickstart"
  to the nav across all 6 pages.

## 2026-06-25 — ./beacon setup CLI wizard + reconciled the specs

- Built `./beacon setup` (`src/setup.ts`) — the terminal twin of the in-app Connect flow. Shares ONE
  catalog with the server (`src/core/services.ts`) so the two paths can't drift (refactored
  `/api/connect` onto it). Token input is **hidden in a real terminal** (suppressed echo — won't leak
  on a screen-share); non-TTY input is buffered up front so it's scriptable/testable (the naive
  readline+pipe approach dropped lines — fixed). Verified via a piped smoke test (sets just the
  Anthropic key, writes `.env`). Tested `services.ts` + `env.ts`. typecheck clean, 51 passed / 1 skipped.
- **Reconciled todo/specs (they were stale, still "design-only"):** added **Completion** records to
  both Walk workplans (connectors-library, shared-memory-postgres) — what shipped vs. deferred (retry/
  rate-limit; retention/PII; hybrid recall); rewrote `v1-walk/docs/README.md` from "design-only" to a
  built status table + "shipped beyond the specs" + a **What's next** list; updated `todo/README.md`.
- Next-steps captured for real now: trust-as-a-service (eval-gate the exec summary), connector
  resilience (C3.1), memory governance (M3.3), scheduling (always-on), the OTel/Langfuse backend.
