# walk — the platform (design-only, code later)

**Stage:** Walk. **Not built yet** — this version is **design docs + diagrams**
today; `src/` is reserved for the eventual implementation.

Crawl proves one workflow with n8n. Walk is where we **outgrow no-code**: a second
and third workflow shouldn't each re-solve auth, memory, and trust.

## Scope (design)

- **Connector library + centralized auth** — one module per source (Slack, HubSpot,
  Notion, Drive, Calendar, onchain), instead of per-workflow n8n credentials.
- **Shared memory** (Postgres + pgvector) — cross-agent context, dedup, semantic
  recall: the thing n8n's per-workflow state can't do.
- **Trust core as a service** — the crawl Code node graduates to one HTTP service
  every workflow calls.
- **Control plane** beyond the n8n editor — trigger / history / output for
  non-engineers across *all* workflows.
- **Onboard the 2nd workflow** — prospect intel first (highest survey demand; serves
  the under-served sales/BD half).

The signals that justify *starting* Walk are on the Roadmap (`../docs/crawl-walk-run.html`).

## Layout
- `docs/` — design notes + diagrams (reusing the `docs-site` styling).
- `src/` — reserved for the eventual build.
