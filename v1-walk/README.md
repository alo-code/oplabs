# walk — the platform (being built)

**Stage:** Walk. Crawl proves one workflow with n8n. Walk is where we **outgrow no-code**: a
second and third workflow shouldn't each re-solve auth, memory, and trust. Built as **real
TypeScript**, separate from v0 but interoperable (it emits v0's Artifact shape).

## Status — the thin-but-real slice runs end to end

| Pillar | Pain | State |
|---|---|---|
| **Connector library + central auth** | ③ manual per-source auth · ⑤ no observability | ✅ contract + registry, redacted credential registry, **five connectors** (GitHub + onchain live & zero-key; Slack/Notion/Monday token-gated), uniform telemetry, **bounded retry + rate-limit**. |
| **Trust gate** (the exec brief earns publication) | grounding · no fabricated metrics · no leaks | ✅ v0's grounding + eval gate ported (`src/trust/gate.ts`) — **Create Report is held, not published**, if ungrounded / a figure is invented / a secret leaks (`npm run trust`). |
| **Shared memory** (in-memory + Postgres/pgvector) | ① re-fetch · ④ no shared memory | ✅ one `MemoryStore` interface, two impls (same contract suite), write-through + dedup + semantic recall; cross-agent read proven. |
| **Control plane** (non-engineer surface) | ⑥ not non-engineer-usable | ✅ a zero-dep HTTP page: one **Create Report** button → fetch every source → live activity feed → a **grounded executive summary** (the case study's exec brief, on the platform), connector health, run history, metrics. |

## Run it — one script (onboarding)

```bash
cd v1-walk
./beacon.sh start      # installs deps, starts the control plane, waits until healthy → http://localhost:7878
./beacon.sh status     # is it up? shows live connector health
./beacon.sh restart    # stop + start
./beacon.sh stop       # stop and free the port
./beacon.sh demo       # one-shot: the connectors + memory demos (real calls)
```
Same commands exist as `npm start` / `npm stop` / `npm run restart` / `npm run status` / `npm run demo`.
Open **http://localhost:7878** and click **Run now** on a source. Zero keys needed (a `GITHUB_TOKEN`
only lifts the rate limit).

### Run all locally on the real substrate (Postgres+pgvector)

From the repo root (needs Docker running — Docker Desktop or `colima start`):

```bash
./beacon up      # Postgres+pgvector via docker-compose + the control plane ON it
./beacon status  # backend: postgres+pgvector
./beacon down    # stop the control plane AND Postgres
```
`up` is idempotent and restarts only the server onto the running DB — it does **not** bounce Postgres,
so memory survives a server restart. Equivalent low-level form: `BEACON_DB=1 ./beacon.sh start|stop`.
Proof of a real local run: `evidence/local-postgres/README.md` (the Postgres contract suite, skipped
on a keyless clone, runs and passes here — 34/34).

### Authenticate your services in the app

On the page, Slack/Notion/Monday show **Connect**. Click **+ Connect a service**, pick the service,
and paste its token (each has a link to where to get one) — the source turns healthy with no restart.
Tokens are saved to a gitignored `v1-walk/.env` (loaded by `src/core/env.ts`) and applied live; the
server binds `localhost` only and logs never include token values. This is local-dev convenience over
the same central credential registry; production uses OAuth + a secrets vault. Step-by-step:
[`docs/onboarding.html`](../docs/onboarding.html).

### Demo runthrough (multi-source)

A scripted runthrough for a live demo — a Slack message, a Monday deal change, and a Notion page
update ingested into one shared memory alongside live GitHub + onchain, then one query across all of
them. Slack/Notion/Monday are **demo data** (no tokens needed), replayed through the *real* pipeline:

```bash
./beacon scenario                       # the narrated terminal runthrough
BEACON_FIXTURES=1 ./beacon up           # control plane with all 5 sources live (red "demo data" pill)
```
Evidence: `evidence/scenario/README.md`.

## Or run the pieces directly

```bash
npm install
npm test              # 39 pass / 1 skip (Postgres needs DATABASE_URL) — all offline, zero keys
npm run connectors    # REAL: GitHub public commits + an OP Mainnet read; registry health + metrics
npm run memory        # REAL: agent A writes GitHub activity → agent B reads it via semantic recall
npm run scenario      # the multi-source demo runthrough (fixtures + live)
npm run trust         # the trust gate on a good brief + 3 bad ones (held, not published)
npm run control-plane # → http://localhost:7878 (foreground; Ctrl+C to stop)
```
Evidence of real runs: `evidence/{connectors-library,shared-memory,control-plane,scenario}/`.

## What's built

```
src/connectors/   base.ts (contract + defineConnector, telemetry by construction) · registry.ts
                  (discovery + health) · registry-default.ts (the 5 shipped) · credentials.ts
                  (central, redacted Secret) · http.ts (shared fetch seam) · github.ts · onchain.ts
                  (zero-key, live) · slack.ts · notion.ts · monday.ts (token-gated) · artifact.ts
src/memory/       store.ts (MemoryStore interface) · inmemory.ts · postgres.ts (pgvector) ·
                  embeddings.ts (swappable; local lexical stand-in) · write-through.ts
src/control-plane/ server.ts (node:http; /api/run-all + /api/report) · page.ts (one HTML page,
                  the Create Report button) · run.ts (testable run logic)
src/agents/exec-summary/ summary.ts (grounded executive brief from shared memory; Claude
                  narrative when ANTHROPIC_API_KEY is set, deterministic + grounded otherwise)
src/observability/ telemetry.ts (logs→stderr + metrics; → OpenTelemetry + Langfuse, adr/0003)
migrations/       0001_memory.sql      docker-compose.yml   evidence/   test/
```

## Still design (the broader vision)

- **Trust core as a service** (v0's Code node → a shared HTTP gate every workflow calls), onboarding a
  2nd full workflow (prospect intel — highest survey demand), and the OpenTelemetry/Langfuse backend
  (`../adr/0003-observability.md`). See `docs/connectors-library.md` · `docs/shared-memory-postgres.md`.

The signals that justify *starting* Walk are on the Roadmap (`../docs/crawl-walk-run.html`).
