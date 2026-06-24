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
