# skills/ — the Beacon skill library (product skills)

These are **skills team members download to do their own work** — portable, role-tagged
research/assist skills you drop into your Claude/agent tool. One folder per skill, each a
self-contained [SKILL.md](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
(plus any scripts it needs).

> **Not the same as the repo-root `../../skills/`.** That folder holds *engineering
> playbooks* ("how we build Beacon"). **This** folder holds *product skills* a non-engineer
> downloads and runs. Same `SKILL.md` shape, opposite audience — kept separate on purpose.

## The library

| Skill | For (role) | What it does | Status |
|---|---|---|---|
| [`prospect-intel/`](./prospect-intel/) | **Sales / BD / GTM** | Research a company / person / onchain entity into a grounded, citable one-page intel brief before a call. Real L1 + OP Mainnet reads. | ✅ working |

This is the seed. The catalog is meant to grow one role at a time — see *Adding a skill*. The
browsable, org-wide version of this table (where a teammate filters by their role and clicks
**Download**) is **[`library.html`](./library.html)** — open it in a browser.

## Download / install a skill

A skill is just its folder. To use `prospect-intel` in your own Claude Code:

```bash
# from a clone of this repo
cp -r v0-crawl/skills/prospect-intel ~/.claude/skills/prospect-intel
# then in Claude Code:  /prospect-intel   (or just describe the prospect and it triggers)
```

Or copy the folder into your project's `.claude/skills/`. That's the whole install — the
`SKILL.md` frontmatter (`name` + `description`) is what lets the agent pick it up. The
`prospect-intel` skill also has a runnable onchain step; from `v0-crawl/` run
`npm install` once, then `npm run prospect:onchain -- <address-or-ens>`.

## Why this matters (the case-study line)

Pain ⑥ is *"can't hand it to a non-engineer."* The library is the answer in miniature: the
BD half of the org (~half of ~75 people) self-serves grounded research without waiting on the
one person with the laptop. Every skill inherits the **same trust contract** as the gated n8n
workflows (`v0-crawl/src/trust/`) — cite a real source, never invent a number — so a brief a
salesperson generates is as trustworthy as the exec brief leadership reads.

## Adding a skill

1. `mkdir skills/<name>/` and write `SKILL.md` — frontmatter `name` + a `description` that
   says *when to use it* (that's how the agent matches it), then the procedure.
2. If it needs real tool calls, bundle a small script under `scripts/` (keep it read-only and
   keyless where possible, like `prospect-intel/scripts/onchain-intel.ts`).
3. **Keep the grounding rules in lock-step with `src/trust/`** — the library's promise is that
   every skill's output is groundable.
4. Add a row to the table above **and** a card to `library.html`, tagged with the role(s) it
   serves.

> If a team member keeps doing the same research by hand, that's a missing skill. Add it here
> in the same shape.
