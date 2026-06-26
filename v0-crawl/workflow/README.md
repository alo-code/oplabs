# v0-crawl workflows (n8n)

Two scheduled n8n workflows that share **one** tested trust core:

- **Weekly exec brief** (`exec-brief.json`) — *what shipped* across GitHub/Notion/Slack/Drive → eng + BD framings to two Slack channels. (Documented first, below.)
- **Deal decision-log** (`deal-decision-log.json`) — *what we decided on deals* from HubSpot → `#deal-log`. (See [Deal decision-log](#deal-decision-log) — it reuses most of the exec brief.)

Both follow the same spine — `Schedule → sources → Build activity → Claude → Trust gate → render → Slack` — and the trust gate plus the `{ id, url }` grounding contract are **identical** between them. That's the crawl→walk thesis in miniature: the second workflow is cheap because the first's trust core and normalization are reusable. The decision-log section below notes only what differs.

---

## Weekly exec brief

This is the orchestration for v0: a scheduled n8n workflow that fetches real activity
from the case-study sources, asks Claude for one **grounded** brief, runs it through the
**trust gate**, and (only if it passes) renders **two framings** — an eng digest and a
BD "what shipped & why it matters" — to two Slack channels.

**Sources** — wired now: **GitHub** (commits, multi-repo across the OP Labs org),
**Notion**, **Slack** (one curated channel, read), **Google Drive** (one folder). Stubbed
and one step from on: **Calendar**, **HubSpot**. GitHub stays on an HTTP node (the native
GitHub node has no commits/PRs operation); Slack/Notion/Drive/Calendar/HubSpot are n8n's
**native connectors**, so "connecting" a source is an OAuth click (or one token paste),
not a hand-built request. Every source normalizes to one `{ kind, source, id, url, label }`
shape, so the trust gate never changes when you add one — a new source just enlarges the
citable pool.

## What's verified vs. what you finish

- ✅ **The trust gate logic is tested** — `trust-node.js` is a faithful mirror of
  `../src/trust/` which is unit-tested (`cd .. && npm test` → 5/5). That's the part that
  decides what's safe to publish.
- ✅ **The graph + node wiring** is in `exec-brief.json`.
- 🔧 **You finish it in your n8n.cloud** — I can't run it or handle credentials from here.
  Import → paste the four Code nodes → add credentials → set ids → run. ~15 min.
  Then share the run output and I'll debug anything that misbehaves.

> The Code nodes ship as **fail-loud placeholders** (they `throw` until you paste the real
> `.js`). That's deliberate — an un-configured node should shout, not silently pass.

## Files

| File | Goes into |
|---|---|
| `exec-brief.json` | Import as the workflow (graph + HTTP/Slack/IF nodes) |
| `build-activity.js` | Paste into the **Build activity** Code node — **shared by both workflows** |
| `trust-node.js` | Paste into the **Trust gate** Code node — **shared by both workflows** |
| `render-eng.js` | Paste into the **Render eng** Code node |
| `render-bd.js` | Paste into the **Render BD** Code node |
| `deal-decision-log.json` | Import as the second workflow (HubSpot → `#deal-log`) |
| `render-decision-log.js` | Paste into the decision-log's **Render decision-log** Code node |

## Setup (production)

**1. Import** `exec-brief.json` (n8n → Workflows → Import from File).

**2. Paste the four Code nodes** from the `.js` files above. (They `throw` until you do.)

**3. Add credentials** (n8n → Credentials; never commit these). Each source node ships
with a `REPLACE_*` credential reference — open the node, pick/create the credential, save.
- **GitHub** *(HTTP, Header Auth)* — name it so the header is `Authorization: Bearer <read-only PAT>`. Attach to *GitHub: commits*. Public repos work with any read PAT.
- **Anthropic** *(HTTP, Header Auth)* — header `x-api-key: <key>`. Attach to *Claude: summarize*.
- **Slack** *(native, one OAuth2 connection for read **and** post)* — create a **Slack OAuth2 API** credential and authorize it; scopes must cover `channels:history` (+ `groups:history` for private channels) for the read, and `chat:write` (+ `channels:read`) for the posts. Attach the **same** credential to all four Slack nodes (*Slack: #releases*, *Post → #eng-updates*, *Post → #gtm-shipped*, *Held: notify ops*). The app/bot must be a member of the channel it reads and the three it posts to (`#eng-updates`, `#gtm-shipped`, `#beacon-ops`).
- **Notion** *(native)* — create a **Notion API** credential = an internal integration token, then **share the target database with that integration** (Notion → database → ••• → Connections). Attach to *Notion: pages*.
- **Google Drive** *(native, OAuth2)* — create a **Google Drive OAuth2 API** credential and authorize it (read scope is enough). Attach to *Drive: folder*.

**4. Paste the Claude system prompt** into *Claude: summarize* (the node body references it; full text below).

**5. Set targets** (Settings → **Variables/Env**, or your n8n env — no ids are baked into the JSON):
- `GITHUB_REPOS` — comma-separated `owner/repo` list, e.g. `ethereum-optimism/optimism,ethereum-optimism/op-geth` (default: the OP Stack monorepo). The *GitHub: repos* node fans these out so *GitHub: commits* runs once per repo.
- `NOTION_DATABASE_ID` — the database the integration can see.
- `SLACK_CHANNEL_ID` — the one channel to read (e.g. `#releases`). Also set `SLACK_WORKSPACE` (your `*.slack.com` subdomain) so `build-activity.js` can build clickable message permalinks.
- `GDRIVE_FOLDER_ID` — the one folder to scan.
- `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`).
- Output channels live in `render-eng.js` / `render-bd.js` (`#eng-updates`, `#gtm-shipped`) and the held channel is in *Held: notify ops* (`#beacon-ops`).

**6. Run now:** click **Test workflow**. Each wired source contributes independently and every source node is set to **continue on error**, so the workflow **degrades gracefully** — a source you haven't connected yet (or one with nothing in the window) just adds nothing; it never fails the run. Tip: while a source is still unconnected, you can simply **disable that node** to keep the run clean.

## What you should see
- **Gate passes** → a post in `#eng-updates` (technical) and `#gtm-shipped` (BD), every bullet citing a real artifact.
- **Gate fails** (ungrounded, or a BD line invents a figure) → **no brief is posted**; `#beacon-ops` gets the held-reason. That's the trust gate doing its job.

Capture the run (n8n execution view + the two posts + the eval score) into `../evidence/exec-brief/` as the v0 evidence.

## The Claude system prompt (paste into *Claude: summarize*)

```
You write OP Labs' weekly internal shipped-brief. You are given a JSON `activity` object:
real artifacts (GitHub commits/PRs, Monday items, Notion pages, Slack messages, Drive
files), each { kind, source, id, url, label }.

Output STRICT JSON ONLY (no prose, no markdown fences), matching:
{ "title": string, "window": { "from": string, "to": string },
  "sections": [ { "heading": string,
                  "bullets": [ { "text": string, "whyItMatters"?: string, "citations": string[] } ] } ] }

Rules:
- Every bullet MUST cite >=1 artifact by its `id` (or `url`) from the activity. Mention
  nothing that is not in the activity.
- `text` = a crisp technical line (for engineers).
- `whyItMatters` = optional plain-language customer/business relevance (for BD). NEVER
  invent a number, %, or multiplier that is not present in a cited artifact's label.
- 2-4 sections (e.g. Shipped, In progress, Notable); skip empty ones. ~5-12 bullets total.
```

## How it works

```
Schedule → [GitHub(n repos) · Notion · Slack(1ch) · Drive]  → Build activity
           (+ Calendar · HubSpot stubs, one click from on)   → Claude (grounded brief)
         → Trust gate ──pass?──┬─ yes → Render eng → #eng-updates
                               │              └ Render BD → #gtm-shipped
                               └─ no → Held: notify #beacon-ops
```
One grounded brief, one gate, two framings. The trust gate is the tested core; everything
else is fetch/summarize/deliver that n8n's nodes handle.

## Enabling a stub (Calendar, HubSpot)
Both ship as **disabled native nodes** that aren't yet wired into the graph (so they can't
inject passthrough items while off). To turn one on: add its credential, set its target,
**enable** the node, and **connect its output into *Build activity*** (drag the wire).
`build-activity.js` already has their mappers, and grounding/evals don't change — they key
off `id`/`url`, so a new source just enlarges the citable pool.

## Troubleshooting
- **A Code node throws "not configured"** → you haven't pasted its `.js` yet (Build activity / Trust gate / Render eng / Render BD).
- **Node version mismatch on import** → n8n may upgrade a node; re-open the node and re-pick the
  resource/operation if a parameter looks empty. Native node types used: `slack`, `notion`,
  `googleDrive`, `googleCalendar`, `hubspot` (plus `scheduleTrigger`, `httpRequest`, `code`, `if`).
- **A native node param reads empty after import** → re-select it from the dropdown; the value
  (e.g. an `$env` resource-locator) re-binds. The targets are env-driven, so confirm `GITHUB_REPOS` / `NOTION_DATABASE_ID` / `SLACK_CHANNEL_ID` / `GDRIVE_FOLDER_ID` are set.
- **Notion returns nothing** → the integration isn't shared with the database (Notion → ••• → Connections), or `NOTION_DATABASE_ID` is wrong.
- **Slack read returns nothing / not_in_channel** → invite the app to that channel; check `channels:history` scope and `SLACK_CHANNEL_ID`.
- **GitHub returns one item with an array** → ensure *GitHub: commits* splits the response into
  items (Settings → "Split Into Items"), or the loop in `build-activity.js` will only see one.
- **Claude output won't parse** → the trust node extracts the first `{…}` block from the model
  text; make sure the system prompt above (STRICT JSON) is set.
- **Everything gets held** → check `#beacon-ops` notes; usually the model cited an id not in the
  activity, or put a `%`/`×` in a "why it matters" line. That's correct behavior — tighten the
  prompt, don't loosen the gate.
