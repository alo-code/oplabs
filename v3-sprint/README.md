# sprint — ambient access (design-only, code later)

**Stage:** Sprint. **Not built yet** — design docs + diagrams; `src/` reserved.

Run makes the org *run* AI work safely. Sprint makes that knowledge **ambient**:
every employee can ask all of company memory in plain language, from the tool they
already work in — Claude Code, Cursor, Claude.ai, Slack — through one internal
**MCP server**.

## The shift

v0 → v2 build a platform you *go to* (a workflow, a control plane). Sprint removes
the last bottleneck — **the interface itself**: the knowledge comes to you, inline,
instead of you going to fetch it. Beacon stops being "a platform the team runs" and
becomes "the institutional memory every employee can query."

## Scope (design)

- **Beacon MCP server** — exposes the governed read API as MCP tools (`ask`,
  `search_memory`, `get_brief`, `list_workflows`, `run_workflow`) that any MCP client
  can call. One server, every tool.
- **Thin adapter, not a new system** — a pass-through to v1's connectors / memory /
  trust and v2's governance. The MCP enforces *nothing new*: identity goes in, v2's
  policy engine decides. (If the MCP became the access layer, people would route
  *around* governance — so it deliberately doesn't.)
- **Identity propagation** — the caller's identity rides every call, so v2 access
  control + the per-user audit log apply. Same question, scoped to what *you* may see.
- **Grounding still holds** — every answer cites real artifacts; an ungrounded answer
  is refused, even ad-hoc. The trust core is the same spine, one more time.
- **Read-first** — Sprint opens *read* broadly; *write* / actions stay scoped and
  policy-gated (which is exactly the onchain spend-gate seam from v2 — write = spend).

The signals that justify *starting* Sprint are on the Roadmap
(`../docs/crawl-walk-run.html`).

## Layout
- `docs/` — design notes + diagrams (reusing the `docs-site` styling).
- `src/` — reserved for the eventual build.
