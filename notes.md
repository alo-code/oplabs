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
