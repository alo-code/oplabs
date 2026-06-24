# todo/ — workplans (planned & ongoing work)

A workplan is a problem turned into ordered slices, each shipped through the cadence
(`CADENCE.md`). Use `WORKPLANTEMPLATE.md` to start one; `skills/writing-workplans.md` for how.

## Current state

| Plan | Maps to | Status |
|---|---|---|
| [`roadmap.md`](./roadmap.md) | the whole arc | current — polished + visual as `docs/crawl-walk-run.html` |
| [`exec-brief-slice.md`](./exec-brief-slice.md) | **v0-crawl** | ✅ **shipped** — built as an n8n workflow + a tested TS trust core, not the original 9 TS slices. Runnable: [`../v0-crawl/`](../v0-crawl/). The plan is kept for the record (how the thinking started). |

The two **Walk** workplans (connectors, shared-memory) moved to
[`../v1-walk/docs/`](../v1-walk/docs/) — they're v1 *design* now, not pending crawl work.
**Run** (governance, self-serve, onchain) lives as design in [`../v2-run/docs/`](../v2-run/docs/).

## Lifecycle
drafted → in-progress → closed. On close: a Completion note on the workplan, proof under
`evidence/`, a `CHANGELOG.md` line.
