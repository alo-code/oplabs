# Evidence — multi-source demo runthrough

**Captured:** 2026-06-25 · **Commands:** `npm run scenario` and `BEACON_FIXTURES=1 ./beacon up`

## What it is

A scripted runthrough for the live demo: three events — a **Slack** message, a **Monday** deal
change, a **Notion** page update — are ingested into ONE shared memory alongside the always-real
**GitHub** + **onchain** sources, then a single semantic query answers across all of them.

**Honesty:** Slack/Notion/Monday are **demo/fixture data** (we don't have OP Labs' tokens), but they
replay through the *real* connector mapping, grounding shape, dedup, shared memory, and control
plane — identical to the live GitHub + onchain sources. Labeled "demo data" everywhere it shows.

## `npm run scenario`

```
①  📨  Slack — a teammate posts in #gtm-shipped …
      → priya: 🚀 Upgrade 19 (Holocene) is live on OP Mainnet — fault proofs enabled for 3 more chains
      Beacon ingested 3 Slack message(s).
②  📋  Monday — the Acme deal moves to 'Won' on the GTM Pipeline board …
      → Acme Chain — L2 launch (moved to: Won)
      Beacon ingested 3 Monday item(s).
③  📝  Notion — the 'Upgrade 19 — Launch Notes' page is updated …
      → Upgrade 19 — Launch Notes (updated)
      Beacon ingested 3 Notion page(s).
…and the always-real sources (live, zero keys):
      GitHub  → 47 commits     onchain → 1 OP Mainnet block

Re-running every source (nothing new happened) …
      → 0 new, 9 dedup — Beacon doesn't re-fetch what it's already seen (pain ①).

Now ask shared memory ACROSS all sources: "what shipped and what deal news this week?"
   0.378  [monday]  Acme Chain — L2 launch (moved to: Won)
   0.333  [slack]   priya: 🚀 Upgrade 19 (Holocene) is live on OP Mainnet …
   0.333  [notion]  Customer: Acme Chain onboarding
   0.298  [notion]  Upgrade 19 — Launch Notes (updated)
   0.222  [github]  chore(deps): bump Go vulnerability deps (#21450)
→ one grounded, shared source of truth across Slack · Monday · Notion · GitHub · onchain.
```

## In the control plane (`BEACON_FIXTURES=1 ./beacon up`)

All five sources report healthy; the page shows a red **"demo data"** pill and enables Run on each:

```
fixtures mode: True | backend: postgres+pgvector
   OK  github   - rate-limit remaining 59
   OK  onchain  - OP Mainnet head 153383377
   OK  slack    - team OP Labs (demo)
   OK  notion   - token ok
   OK  monday   - as Beacon Demo
```
Run the scenario with `DATABASE_URL` set and the page's memory panel fills with items from all five
sources. The fixtures live in `src/connectors/fixtures.ts`; tested in `test/connectors/fixtures.test.ts`.
