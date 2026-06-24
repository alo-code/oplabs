# v0-crawl workflow — the weekly exec brief (n8n)

This is the orchestration for v0: a scheduled n8n workflow that fetches real activity
from up to five sources, asks Claude for one **grounded** brief, runs it through the
**trust gate**, and (only if it passes) renders **two framings** — an eng digest and a
BD "what shipped & why it matters" — to two Slack channels.

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
| `build-activity.js` | Paste into the **Build activity** Code node |
| `trust-node.js` | Paste into the **Trust gate** Code node |
| `render-eng.js` | Paste into the **Render eng** Code node |
| `render-bd.js` | Paste into the **Render BD** Code node |

## Setup (production)

**1. Import** `exec-brief.json` (n8n → Workflows → Import from File).

**2. Paste the four Code nodes** from the `.js` files above. (They `throw` until you do.)

**3. Add credentials** (n8n → Credentials; never commit these):
- **GitHub** — Header Auth credential named so the header is `Authorization: Bearer <read-only PAT>`. Attach to *GitHub: commits*.
- **Anthropic** — Header Auth with header `x-api-key: <key>`. Attach to *Claude: summarize*.
- **Slack** — a Slack Bot token (scopes: `chat:write`, plus `channels:read`/`groups:read`); the bot must be invited to `#eng-updates`, `#gtm-shipped`, `#beacon-ops`. Attach to the three Slack nodes.
- (Later, per source you enable) Monday / Notion / Slack-read / Google Drive.

**4. Paste the Claude system prompt** into *Claude: summarize* (the node body references it; full text below).

**5. Set targets:**
- Env `GITHUB_REPO` (default `ethereum-optimism/optimism`) and `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`).
- Output channels in `render-eng.js` / `render-bd.js` (`#eng-updates`, `#gtm-shipped`) and the held channel (`#beacon-ops`).

**6. Run now:** click **Test workflow**. GitHub-only works immediately (public repo + your token). Enable the other sources as their credentials come online — the workflow **degrades gracefully** (a source with nothing just adds nothing).

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
Schedule → [GitHub · Monday · Notion · Slack(1ch) · Drive] → Build activity
         → Claude (grounded brief) → Trust gate ──pass?──┬─ yes → Render eng → #eng-updates
                                                         │              └ Render BD → #gtm-shipped
                                                         └─ no → Held: notify #beacon-ops
```
One grounded brief, one gate, two framings. The trust gate is the tested core; everything
else is fetch/summarize/deliver that n8n's nodes handle.

## Enabling the other four sources
Each is a disabled HTTP node in the graph. To turn one on: add its credential, set its query
(window + the one channel/folder/board/db you're scoping to), enable the node, and add its
mapper to `build-activity.js` (shapes are noted inline there). Grounding/evals don't change —
they key off `id`/`url`, so a new source just enlarges the citable pool.

## Troubleshooting
- **A Code node throws "not configured"** → you haven't pasted its `.js` yet.
- **Node version mismatch on import** → n8n may upgrade a node; re-select the node type if a
  parameter looks empty. Types used: `scheduleTrigger`, `httpRequest`, `code`, `if`, `slack`.
- **GitHub returns one item with an array** → ensure *GitHub: commits* splits the response into
  items (Settings → "Split Into Items"), or the loop in `build-activity.js` will only see one.
- **Claude output won't parse** → the trust node extracts the first `{…}` block from the model
  text; make sure the system prompt above (STRICT JSON) is set.
- **Everything gets held** → check `#beacon-ops` notes; usually the model cited an id not in the
  activity, or put a `%`/`×` in a "why it matters" line. That's correct behavior — tighten the
  prompt, don't loosen the gate.
