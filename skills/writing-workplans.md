# Skill: writing a workplan

A workplan in `todo/` turns a problem into an ordered set of slices. Use
`WORKPLANTEMPLATE.md` as the skeleton. This is how to make it good.

## Start from user-visible pain, not solutions
- Bad: "Add a Postgres memory store."
- Good: "Agents re-fetch the same Slack history every run; a brief takes 4
  minutes and burns tokens re-reading what it read yesterday. Consequence:
  slow, expensive, and the cost grows with every new agent."

The solution falls out of the pain. Leading with the solution hides whether
it's the right one.

## Slice so each slice is independently shippable + reviewable
A slice is right-sized when:
- it has a single, nameable contract;
- you can write *one* failing test that captures its intent;
- its green diff is small enough to review in one sitting;
- it leaves the system working (not half-migrated) if you stop after it.

If a slice needs three different tests for three behaviors, it's three slices.

## Group into phases with falsifiable exit gates
A phase is a coherent milestone (e.g. "exec brief runs end-to-end on real
data"). Its **exit gate** is a checklist where every item is a checkbox you
can *fail*:
- Falsifiable: "a non-engineer triggers a run from the UI and gets a brief."
- Not falsifiable: "the UI is good." (Good by what test?)

The gate is what stops a phase being declared done by vibes.

## Always include risk + rollback
One paragraph: worst case, what you revert, in what order. For Beacon the
recurring risks are spend (token runaway), auth (a leaked/over-scoped token),
and bad output reaching a stakeholder (an exec brief with a hallucinated
number). Name the rollback before you need it.

## Close the loop
When done, fill the Completion addendum (shipped / graduated / descoped),
land `evidence/<workplan>/`, add a `CHANGELOG.md` line. A workplan with no
completion record is a workplan you'll re-litigate in a month.

## Map to crawl-walk-run
Each workplan should say which stage it serves (see `todo/roadmap.md`). Crawl
earns trust on one workflow; walk turns it into a platform; run scales it.
Don't smuggle "run" ambition into a "crawl" slice.
