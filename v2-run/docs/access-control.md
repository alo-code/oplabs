# Read-side access control — mirror the source ACL (V2, design)

> Design-only. The trust gate decides *whether an answer is grounded*; access control decides
> *whether this person may see what it's grounded in*. V0/V1 don't need it — they're
> executive/admin-only. V2 introduces it, and the V3 MCP (`../../v3-sprint/docs/mcp-server.md`)
> inherits it for free, because the MCP is a thin pass-through and **V2 is the enforcement point.**

## The idea in one line

When "ask the company" becomes ambient (V3), *"ask anything"* must not become *"read anything."*
So every memory row carries the **real access list of the artifact it came from**, every caller
arrives as a **verified identity**, and recall returns only the intersection. We don't invent a
permission model — we **mirror the one the source platform already enforces**. A junior engineer
and the CEO ask the same question and get answers scoped to what *each* may already see in Slack,
Notion, Drive, Monday, and onchain.

## Why V0 and V1 don't have this (and shouldn't)

V0 (crawl) and V1 (walk) are **executive / admin-only** systems — a tiny, trusted audience
operating the platform. For that audience, *full read is correct*: shared memory is genuinely
shared, and adding per-row authorization would be governance machinery for users who all have the
same clearance. This matches crawl-walk-run discipline — don't build the control before there's a
population that needs it.

Two things keep that honest rather than accidental:

- **The boundary is the perimeter, not the row.** V1's "exec/admin-only" is enforced at the front
  door — SSO / basic-auth in front of the control plane and any deployment
  (`oplabs-demo.daciasec.net`) — *not* inside the store. Inside, everyone who's through the door
  sees everything, on purpose.
- **The V1 corpus has a defined fate.** Everything written during V0/V1 has no ACL attached. When
  V2 turns on access control, that corpus inherits an **`exec/admin` audience by default** —
  because that genuinely *was* who could see it. That's default-deny, not "everything written
  before V2 is suddenly world-readable."

Access control starts at V2 because V2 is where the population gets *sophisticated* — many teams,
many clearances, self-serve — and V3 is where it becomes *load-bearing*, because the MCP opens the
door to everyone at once.

## The model — mirror the source ACL, don't reinvent it

The artifact's home platform is the **system of record for who may see it**. A Slack message is
readable by the channel's members; a Notion page by whoever it's shared with; a Drive file by its
`permissions` list; a Monday item by the board's subscribers. So a memory row **inherits the ACL
of its source artifact**, and access is a set intersection:

```
caller may see row  ⇔  caller ∈ expand(row.source_acl)
```

This is the lowest-friction model that exists: **no channel renames, no Notion reorg, no taxonomy
to maintain.** The org's existing information architecture *is* the policy. It also can't drift
away from the truth, because the truth is exactly what we copy.

Two axes, kept separate:
- **Access** (`source_acl`) — *who* may read it. Answers the authorization question. This doc.
- **Sensitivity** (`classification`) — *how* it must be handled (PII, residency, "never put in an
  LLM context"). A second, lighter field, derived where possible; it governs handling rules, not
  identity. Don't conflate them — an ACL of three people doesn't tell you the content is PII, and a
  PII flag doesn't tell you who's allowed to read it.

## Identity — verified, propagated, enforced downstream

The whole model rests on the caller's identity being **authentic**, so it cannot be a self-asserted
email in a header (spoofable). It is the `email` / `sub` claim from an **OIDC/OAuth token** the user
obtains by authenticating to the MCP (or the control plane) through the org SSO.

```
MCP client        →   Beacon MCP            →   V2 access control       →   V1 platform
(Claude Code,         authenticates caller,     resolves identity,           connectors ·
 Cursor, Slack)       stamps verified            expands groups,             memory · trust
                      principal — enforces       intersects vs row ACL,
                      NOTHING                     logs per-user — DECIDES
```

The MCP **establishes who**; it does not **decide what**. Decisions are V2's, so no one can route
around governance by talking to the MCP directly — the same rule as the onchain seam: the gate is
not the caller's to move.

## The two enforcement points

A retrieval system leaks if it filters *after* the model sees the text. So access control happens
**before** retrieval, with a live backstop on the way out:

1. **Pre-retrieval filter (cached, fast).** Every `recall` / `semanticRecall` carries the
   `principal`, and the store filters by ACL **before** the vector search returns candidates —
   Postgres row-level security or an explicit `WHERE principal ∈ source_acl` predicate. The model is
   *physically incapable* of citing a row the caller can't read; nothing out-of-clearance ever
   enters context.
2. **Cited-set revalidation (live, exact).** Just before answering, re-check the handful of
   artifacts about to be **cited** against the source live. Small N, so it's affordable, and it
   closes the staleness gap (below): the answer never cites something the caller lost access to
   since the last sync.

And the grounding gate inherits a clearance rule: **if the only grounding for a question is a row
the caller can't see, the answer is "no grounded answer available to you"** — not a blurred summary
built from material they're not cleared for. "Ask anything" can't leak by inference.

## The data model (sketch)

Additions to `memory_items` (`../../v1-walk/migrations/0001_memory.sql`):

```sql
ALTER TABLE memory_items
  ADD COLUMN source_acl     JSONB,          -- resolved principals/groups who may read the source
  ADD COLUMN acl_synced_at  TIMESTAMPTZ,    -- when source_acl was last refreshed (staleness clock)
  ADD COLUMN classification TEXT,           -- handling axis: public|internal|confidential|restricted
  ADD COLUMN label_rule     TEXT;           -- provenance: which rule produced the ACL (auditable)

-- pre-retrieval predicate (RLS or explicit), e.g.:
--   WHERE source_acl ?| current_principal_groups   -- jsonb overlap with the caller's expanded set
```

Plus an **identity-resolution table** — the unglamorous, mandatory plumbing that maps one human to
their id in every platform, so "is the caller in this Slack-id ACL" is answerable from an email, and
so group grants can be expanded:

```sql
CREATE TABLE identity (
  person      TEXT PRIMARY KEY,   -- canonical (SSO subject / email)
  slack_id    TEXT, notion_id TEXT, google_id TEXT, monday_id TEXT,
  groups      JSONB               -- expanded group memberships (nested groups flattened)
);
```

This is the *same* table the user→group whitelist needs — built once, used by both the ACL-mirror
and any group-level policy.

## The connector contract

Each connector already fetches artifacts; in V2 it also resolves their ACL:

```ts
interface AclAware {
  /** Who may read this artifact in the source platform, at the coarsest correct unit. */
  fetchAcl(artifact: Artifact): Promise<{ principals: Principal[]; rule: string }>;
}
```

Resolve at the **coarsest correct unit** to keep cost sane: Slack is naturally *per-channel*
(`conversations.members`) — the channel *is* the ACL boundary; Drive/Notion/Monday are *per-item*
(`permissions.list` / page-sharing / board subscribers), more expensive, so cache hard.

## What "simply use the source ACL" really costs (and how we pay it)

Three real costs — go in eyes-open:

| Cost | Why it bites | Mitigation |
|---|---|---|
| **Fetch is O(documents)** | every artifact needs an ACL; per-item APIs hit rate limits at scale; Notion's permission API is weak | resolve at the **coarsest correct unit** (channel, teamspace) and **cache** the resolved set on the row |
| **Staleness — the hard one** | a copied ACL is a snapshot; revoke someone in the source and the row still grants them access | **sync** (schedule + webhooks: Slack member events, Drive changes feed; poll Notion) **+ revalidate the cited set live** so the user-facing answer is always exact |
| **Cross-platform identity** | the ACL is in Slack-ids; the caller is an email; Drive/Notion grant to *groups* that must be expanded recursively | the **identity-resolution table** + group expansion (built once, shared with the whitelist) |

Staleness is the only genuinely hard problem; everything else is plumbing. You **cannot** dodge it
by checking purely live at query time — pre-retrieval filtering forbids a per-candidate source call
over thousands of chunks — so you cache for the filter and revalidate only the small cited set. The
honest residual is a bounded window (synced-but-not-yet-resynced) that never reaches the user,
because revalidation gates the citation. Name it, bound it, audit it.

## Fallback and the default-deny floor

When a source won't yield a clean ACL via API (Notion, often), fall back — in order:
1. the **container convention** — a teamspace, or a Slack channel prefix, mapped to an audience
   (a fast proxy for the real ACL, admin-maintained);
2. if that's also unknown, **deny** — the artifact does **not** enter queryable memory (or lands in
   a restricted bucket). Unresolved ACL **never** defaults open.

Two source-specific notes that *help* us:
- **Slack bot-membership is itself a gate.** The connector only reads channels the bot is in; a
  private `#exec-*` channel is dark until someone deliberately invites the bot — an explicit,
  audited decision to bring it under governance.
- **Notion page-sharing can diverge from its teamspace.** Teamspace is the cheap default; for
  anything `restricted`, the page's *actual* shared-with list wins.

## The admin surface (on `oplabs-demo.daciasec.net`)

The live control plane becomes V2's central governance surface — **admin-only, behind the same
SSO** the MCP uses (so MCP identity and admin auth are one IdP integration, done once). It manages:

- **Identity resolution** — the person↔platform-id map and group memberships (later: synced from
  the IdP / Google Workspace OUs / Slack usergroups, so it doesn't rot — whitelist is crawl,
  IdP-sync is run).
- **ACL overrides & fallback rules** — container→audience mappings for sources we can't read
  cleanly; per-item overrides that *narrow* (never silently widen).
- **Sync health** — last sync per source, drift/reconciliation alerts ("N new channels
  unclassified → default-deny"), so silent gaps are loud.

Every change here is a **privilege grant**, so every change is in the per-user audit log. Group
membership read live (or short-TTL) so a revoke actually revokes.

## How V3 inherits it

The V3 MCP adds *nothing* to this. It authenticates the caller and stamps the principal; the same
pre-retrieval filter + cited-set revalidation + per-query audit apply to `ask` / `search_memory` /
`get_brief`. **Read** is opened broadly under this model; **write** (`run_workflow`) stays behind
the spend gate (`./onchain-seam.md`) — read = the grounding gate, write = the spend gate.

## Same vs. new
- **Same as the trust gate:** a deterministic check *before* the act; default-deny; a loud
  blocked/held path; everything audited.
- **New:** the gated thing is *read access*, not a claim or a spend; "grounding" gains a clearance
  clause; the policy is **mirrored from the source**, not authored; the residual risk is staleness,
  paid down by sync + cited-set revalidation.

## Crawl-walk-run on the seam itself
- **Start:** one team, one source (Slack). Mirror channel membership; pre-retrieval filter only;
  audit live. Signal to proceed: a week of queries with **zero out-of-clearance citations**.
- **Then:** all read sources, ACL sync + cited-set revalidation, identity-resolution table, the
  admin surface — org-wide, per-user audit.
- **Run:** IdP-group sync replaces the hand-maintained whitelist; classification (sensitivity)
  policy enforced alongside access; relationship-scoped (ABAC) access for deal/customer data layered
  on top of group access.

## Why this matters for OP Labs specifically

A ~75-person org runs on mixed-sensitivity data — HubSpot deal intel, exec briefs, board and comp
material — across exactly the sources Beacon connects. "Ask the company" is only shippable if it
**provably mirrors the permissions of the systems it reads from.** Mirroring the source ACL gets
that with the *least* friction — no reorg, no taxonomy — and it's the same identity + audit spine as
the onchain seam, so the internal tool you trust today and the onchain product you ship tomorrow
(Option 2) stay **one system, not two.**
