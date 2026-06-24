# Demo script — 20–30 min live presentation

Option 1 ("our AI workflows don't scale"). Goal: sell **trust** and **outcome**, not
architecture. Lead with a live moment; let the architecture answer "how."

## Spine (≈20 min + 10 for Q&A)

**0:00 — The problem (90s).** One person, a laptop, real AI workflows that don't scale: re-fetch,
sleeps, manual auth, no shared memory, no observability, can't hand to a non-engineer. Open the
branded site (oplabs.daciasec.net) — *"I built you something that looks like your product."*

**1:30 — The outcome, first (2 min).** *"Every Monday, leadership and BD get this — grounded,
automatic, every line clickable proof."* Show a real brief; click a citation → the real GitHub commit.

**3:30 — The wow: watch it refuse to lie (3 min).** `cd v0-crawl && npm run demo`. Good brief
publishes; a brief citing a fake PR is **held**; a brief inventing "40%" is **held** — both score
above the 0.8 floor and are refused anyway. *"Trust isn't a vibe; it's a gate."*

**6:30 — The architecture, briefly (3 min).** n8n.cloud (always-on + observability + a visual
workflow a non-engineer can edit) + a tested TS trust core mirrored into a Code node. One grounded
brief → two framings (eng + BD). Show the n8n canvas.

**9:30 — Crawl → Walk → Run → Sprint (4 min).** The Versions page. Each stage removes a different
bottleneck (laptop/trust → eng-capacity → governance → reach); you move on a signal, not a date. The
trust core is the through-line — all the way to **Sprint**, an internal MCP server that lets everyone
ask company memory in plain language from any AI tool (the capstone vision).

**13:30 — Stakeholders + metrics (3 min).** 75 people, half sales/BD (the under-served half).
Requirements by survey + scoring, re-run at each gate. Metrics instrumented from day one (eval,
grounded %, cost, time saved).

**16:30 — The onchain bridge (2 min).** The same trust gate that holds an ungrounded brief holds an
agent's *spend* on the OP Stack (smart accounts, session keys, spend policy). Option 1 and Option 2
are one system. *(The OP-specific close.)*

**18:30 — What's next (90s).** The real run + evidence; v1 when a 2nd team pulls; honest restraint —
don't build the platform until one workflow earns it.

## Live-demo checklist
- [ ] `npm run demo` runs offline (no keys) — rehearse it.
- [ ] Real run done (or a rendered brief ready) + a citation to click.
- [ ] Site loads at oplabs.daciasec.net (or local `docs/`).
- [ ] One slide each: problem, crawl-walk-run, onchain.

## Q&A prep (the likely questions)
- **Why TypeScript, not Python/Go?** Judgment call — strongest language for a clean runnable slice;
  production stays polyglot behind seams. (notes.md / Overview.)
- **Why n8n, not custom code?** It removes three pains for free; the only real code is the trust core
  (the differentiator). Build-vs-compose judgment.
- **How does this earn trust in production?** Grounding gate + evals + observability from day one; a
  bad brief is held, not published; signals gate each stage.
- **Isn't 5 sources scope creep for crawl?** n8n makes a source a node; the trust core is
  source-agnostic; sources scale the brief, not the risk.
- **What if the model is down / wrong?** The gate fails closed (held, not published); the model is
  swappable behind an interface; n8n retries + run history make failures loud.
