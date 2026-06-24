# v3-sprint — ambient-access design (design-only)

> Design, not code. Where Beacon's knowledge becomes **ambient** — askable in plain
> language from any tool the team already uses, via one internal MCP server. The binding
> constraint shifts from "who's allowed" (v2 governance) to **reach**: the knowledge isn't
> where people work.

| Pillar | Design |
|---|---|
| **MCP server** | [`mcp-server.md`](./mcp-server.md) — the governed read API exposed as MCP tools any client (Claude Code, Cursor, Claude.ai, Slack) can call |
| **Thin adapter** | a pass-through to v1 (connectors · memory · trust) + v2 (governance); the MCP enforces nothing new — identity in, v2 policy decides |
| **Identity + audit** | each call carries the caller's identity, so v2 access control + the per-user audit log apply; same question, scoped per person |
| **Grounding at the edge** | ad-hoc NL questions are higher-variance than a fixed workflow, so the grounding gate matters *more*: an answer without a real citation is refused |
| **Read-first** | read opens broadly; write/actions stay scoped + policy-gated — the same gate that becomes onchain *spend* (the Option 2 bridge) |

**The through-line from v0:** the trust gate is the same primitive at every stage — a Code
node → a service → a governed service → **the boundary of an ambient query**. Get it right
once, carry it everywhere.
