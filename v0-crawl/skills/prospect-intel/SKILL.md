---
name: prospect-intel
description: >-
  Research a prospect — a company, a person, or an onchain entity — into a short, fully
  grounded, citable intel brief before a call, a deal review, or a qualification pass. Use
  this when anyone on the team needs to prep for a meeting, qualify an inbound lead, enrich
  a HubSpot deal, or decide whether a prospect is a fit for the OP Stack. It pulls public
  web, the prospect's onchain footprint (Ethereum L1 + OP Mainnet — real reads, no keys),
  and any internal context the user already has access to, and every claim cites a real,
  clickable source. Trigger on phrases like "research this prospect", "who is <company>",
  "prep me for the <X> call", "is <company> a fit", or "build intel on <address/ENS>".
metadata:
  role: Sales / BD / GTM
  owner: Beacon (Option 1 — internal AI workflows)
  status: working
  grounding: required
---

# Prospect Intel

Turn a prospect into a **one-page, grounded intel brief** the user can read in two minutes
before a call. Same trust ethic as Beacon's exec brief: **every factual line cites a real
source the researcher actually opened, and nothing is invented.** A brief with uncited
claims is not done.

This skill is portable — it's a single folder a team member downloads from the Beacon skill
library and drops into their own Claude/agent tool. It is the **front door**; the heavy,
always-on grounded workflows (exec brief, deal decision-log) live in n8n. Use this when the
research is *ad-hoc and personal* ("prep me for the 3pm"), not scheduled.

## When to use it

- Prepping for a first call / discovery with a prospect.
- Qualifying an inbound lead before it becomes a HubSpot deal.
- Enriching an existing deal with onchain reality before a review.
- Answering "who is this company / person / wallet, and are they a fit for the OP Stack?"

## When **not** to use it

- A scheduled, org-wide roll-up → that's the **exec brief** / **deal decision-log** n8n
  workflows, not this.
- Anything that needs to *write* to a system of record (HubSpot, Notion) → this skill is
  read-only and produces a brief; a human decides what to log.
- Due diligence that must be legally defensible → escalate; this is sales prep, not counsel.

## Inputs

One of:
- a **company** name or domain (e.g. `acme.xyz`),
- a **person** (name + company, or a LinkedIn/X handle),
- an **onchain identity** (a `0x…` address or an `….eth` ENS name).

Optionally, the user can paste internal context they already have access to (a HubSpot deal,
a Notion account page, prior Slack threads). The skill **never** reaches into systems the
user can't see — it grounds only in sources the user can open.

## Procedure

Work in four passes. Keep a running list of **sources** (every URL you actually open); the
brief will cite from exactly that list.

1. **Frame.** Restate the prospect and *why we're researching* (call prep / qualification /
   deal review). If the prospect is ambiguous (common company name), ask one clarifying
   question before spending effort.

2. **Public web.** Search for: what the company does, who's who (the people on the call),
   recent news/funding, and any signal they're building onchain or evaluating an L2 / rollup
   / "appchain" / OP Stack. Open the primary sources (their site, the post, the filing) — do
   not cite a search-results page. Note the URL of each source you actually read.

3. **Onchain footprint (the part that's non-mocked).** If you have an address or ENS, run the
   bundled script for a **real, read-only** footprint on Ethereum L1 and OP Mainnet:

   ```bash
   cd v0-crawl
   npm install                              # first time only
   npm run prospect:onchain -- vitalik.eth  # or a 0x address; no arg → a known example
   ```

   It prints `artifacts[]` in Beacon's groundable shape
   (`{ kind:"onchain", source, id, url, label }`), each with a block-explorer URL. Fold those
   straight into the brief — an onchain line then cites a link a reviewer can click. For an
   OP Stack prospect, "do they actually transact, and where?" is real qualifying signal, so
   this footprint is the spine of the brief, not a footnote. (No keys, no transactions — it
   only reads. If a chain's RPC is down it degrades to a `skipped` note rather than guessing.)

4. **Internal context (only what the user can see).** If the user pasted a HubSpot deal,
   Notion page, or Slack thread, use it — and cite it by its real link. Don't fabricate
   internal history.

Then **ground and write** (next section).

## Output — the Prospect Brief

Markdown, ≤ ~1 page. Lead with the bottom line, then the evidence. Use this shape:

```
# Prospect Brief — <Prospect>
_Researched <date> · for <call prep | qualification | deal review>_

**Bottom line:** <1–2 sentences: who they are + the fit call + recommended next step.>

## Company        — what they do, stage, size, recent signal.        [each line cited]
## People          — who's on the call, role, anything relevant.       [cited]
## Onchain footprint — L1 / OP balances + activity, chains they run.    [block-explorer links]
## Fit & signals   — why they are / aren't an OP Stack fit.            [cited]
## Risks / unknowns — what we couldn't verify (say so explicitly).
## Recommended next step — the one thing to do before/after the call.

### Sources
[1] <label> — <url>
[2] …
```

Every bullet outside *Risks / unknowns* and *Recommended next step* must carry at least one
`[n]` citation into the **Sources** list. If you can't cite it, it goes under *Risks /
unknowns* as "unverified", or it doesn't go in.

## Grounding rules (the trust contract — same as the exec brief)

These mirror `v0-crawl/src/trust/` (the tested gate the n8n workflows run). Hold yourself to
them by hand here:

1. **Every factual claim cites a real source you opened.** No citation → it's an unknown, not
   a fact.
2. **Never invent a number.** No funding figure, headcount, TVL, %, or multiplier unless it's
   in a cited source. This is the single most dangerous failure in sales prep — a made-up
   "$40M raised" repeated on a call burns trust. If you're unsure, write "unverified".
3. **No secrets / PII in the brief.** Don't paste API keys, private emails, or anything that
   looks like a credential. (The exec-brief gate hard-fails on these patterns; do the same.)
4. **Onchain claims cite a block-explorer URL** from the script output — never a guessed
   balance or "they're very active" without the read behind it.
5. **Separate fact from inference.** "They run an OP Stack chain" (fact, cited) vs. "they're
   likely evaluating a migration" (inference — label it as such).

## Self-check before you hand it over

- [ ] Bottom line answers "who + fit + next step" in ≤ 2 sentences.
- [ ] Every Company/People/Onchain/Fit bullet has a `[n]` citation.
- [ ] No number appears that isn't in a cited source.
- [ ] Onchain section reflects the **actual** script output (or says the read was skipped).
- [ ] Unknowns are stated, not hidden.
- [ ] No secrets/PII pasted in.

## Files in this skill

```
prospect-intel/
  SKILL.md                     ← this file (the procedure + trust contract)
  scripts/onchain-intel.ts     ← real, read-only L1 + OP Mainnet footprint → groundable artifacts
```

> Improving this skill? Keep the grounding rules in lock-step with `v0-crawl/src/trust/`.
> The whole point is that an output from this skill is as trustworthy as one from the gated
> n8n workflows.
