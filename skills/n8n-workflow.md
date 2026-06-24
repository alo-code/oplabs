# Skill: changing the n8n workflow

v0's exec brief is an **n8n.cloud workflow** (`v0-crawl/workflow/exec-brief.json`) with a small
**tested TS trust core** mirrored into a Code node. It's also the surface a *non-engineer* can
edit — in n8n's visual editor. Read this before touching it.

## Rules

1. **The trust gate is the source of truth, and it's tested.** Its logic lives in
   `v0-crawl/src/trust/` (`npm test`, 5/5). The `Trust gate` Code node is a *mirror*
   (`workflow/trust-node.js`). Change the TS → re-run tests → re-paste the node. Never fix the
   gate only in n8n — the repo's tested copy must stay the source of truth.
2. **Every claim stays groundable.** A new source must give each artifact a stable `id` + `url`.
   If it can't be cited, it doesn't belong in the brief.
3. **Fail loud, never silent.** The Code nodes `throw` until configured; an ungrounded brief must
   hit the held path, not get published.
4. **Secrets live in n8n credentials only** — never in the workflow JSON or the repo.

## Add a source (the common change)
1. Add a fetch node (HTTP Request, or the native n8n node) scoped to the window + one
   channel/folder/board.
2. Add a mapper to `workflow/build-activity.js` that returns `{ kind, source, id, url, label }`.
3. Done — grounding/evals don't change; the new artifacts just join the citable pool.

## Editing it as a non-engineer
Open the workflow in n8n and change the schedule, a source's query, or the Slack channels in the
visual editor. The trust gate still runs, so a bad brief is held — **you can't break trust by
editing the workflow.**

## Definition of done
- `npm test` green if you touched the trust core; the node re-pasted from `trust-node.js`.
- A Run-now ("Test workflow") produces a grounded brief — or a clearly *held* one.
- `workflow/README.md` updated if you added a source or a credential.
