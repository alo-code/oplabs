# Skill: building & editing the docs site

`docs/` is the **approach document** for the case study — a small, co-branded
(Beacon × OP Labs) static site. This skill makes it fast to add a page or a
diagram without the result drifting in style. Read it before touching `docs/`.

The whole site is **plain static HTML + one stylesheet. No JS, no build step.**
That's deliberate: it must open from a fresh clone by double-clicking
`docs/index.html` (`file://`), with no server and no network. Keep it that way.

## Rules

1. **One stylesheet, brand in one place.** Every page links
   `assets/beacon.css`. Never add a `<style>` block or inline `style=` to a
   page. The only colors anywhere are the tokens in `:root` (top of
   `beacon.css`) — change a token there and the whole site *and every diagram*
   re-brand. (The one allowed inline `style=` is a per-shape SVG stroke for the
   roadmap's crawl/walk/run stage strokes — noted in `crawl-walk-run.html`.)
2. **Co-brand honestly, black-and-white first.** It's *Beacon, a case study for
   OP Labs* — not an official OP Labs property. Match oplabs.co: **black/white
   dominant**, with OP red (`--red` `#FF0420`) used **sparingly** — inline-link
   hover, the `.note.red` callout, and at most one or two `.d-red` diagram
   highlights. The wordmark is **"Beacon" in italic, no dot**, echoing the italic
   "OP" in the OP Labs logo. Their real face is **Riforma LL** (Lineto, licensed —
   not redistributable); `--font` approximates it with a Swiss-grotesque system
   stack — swap the token to vendor real Riforma. Keep the `for OP Labs ↗` chip, the
   `.site-foot` "Scale Ethereum, Build Optimism" line, and an `OP Labs Case Study`
   `.tag` in each hero. Don't pass it off as internal OP Labs docs; don't invent an
   OP Labs sub-brand.
3. **Copy the page scaffold** (below) for a new page. Set `<title>`, set the
   `.active` class on this page's nav link, and keep the nav + footer blocks
   byte-identical to the other pages.
4. **The nav is duplicated on purpose** (no JS to share it). When you add or
   rename a page you must update the nav block in **every** page:
   `index.html`, `problem-map.html`, `architecture.html`, `crawl-walk-run.html`.
   This file is the source of truth for that block.
5. **Diagrams are hand-authored SVG**, and they use the shared palette classes
   (`class="dgm"` + the `.d-*` classes) — **never hardcode a hex** inside an
   SVG. That's what keeps diagrams on-brand and editable from one place.
6. **Every `<figure>` gets a `<figcaption>`** that says what to take away — the
   diagram is for a non-technical reader.
7. **Every page ends with `.next`** cross-links so the site reads as a path.
8. **Verify by opening the file**, not a server: open `file://…/docs/<page>.html`
   and click through the nav. No console errors, images/diagrams render offline.

## Shape — the page scaffold

```html
<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Beacon — <PAGE> · OP Labs Case Study</title>
<link rel="stylesheet" href="assets/beacon.css" />
</head><body>
<header class="site-top"><nav>
  <a class="brand" href="index.html">Beacon</a>
  <div class="nav-links">
    <a href="index.html">Overview</a>
    <a href="problem-map.html">Problem map</a>
    <a href="architecture.html">Architecture</a>
    <a href="crawl-walk-run.html">Roadmap</a>   <!-- add class="active" on THIS page -->
  </div>
  <a class="nav-op" href="https://www.oplabs.co/" target="_blank" rel="noopener">for OP Labs ↗</a>
</nav></header>
<main>
  <span class="tag">OP Labs Case Study · Option 1</span>
  <h1><PAGE TITLE></h1>
  <p class="sub"><one-line summary for a non-technical reader></p>
  <!-- content: .card / .grid / table.why / figure+svg / .note / .stage -->
  <div class="next">
    <a href="<prev>.html"><div class="k">← Back</div><div class="v"><Prev></div></a>
    <a href="<next>.html"><div class="k">Next →</div><div class="v"><Next></div></a>
  </div>
</main>
<footer class="site-foot"><div class="foot-in">
  <span class="foot-brand">Beacon</span>
  <span>A case study for <a href="https://www.oplabs.co/" target="_blank" rel="noopener">OP Labs</a> · Option 1</span>
  <span class="foot-tag">“Scale Ethereum, Build Optimism”</span>
</div></footer>
</body></html>
```

## Shape — drawing an SVG diagram

Hand-authoring is easy if you treat it as templating on a grid, not freehand:

1. Pick a `viewBox="0 0 880 H"` (880 = the content width; pick `H` for content).
2. Decide a **constant row height** and **left/right margins**; place boxes by
   formula (`x = margin + i*(boxW+gap)`), not by eyeballing.
3. Label at the box **center** (`text-anchor="middle"`, `x = boxX + boxW/2`).
4. Connect with `.d-flow` lines + a `<marker>` arrowhead (unique `id` per page).
5. Use the `.d-*` classes for all fills/strokes/text — no hex.

```html
<figure>
  <svg class="dgm" viewBox="0 0 880 140" role="img" aria-label="<what it shows>">
    <defs>
      <marker id="UNIQUE" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
        <path class="d-arrow" d="M0,0 L9,4.5 L0,9 Z"/>
      </marker>
    </defs>
    <rect class="d-box" x="20" y="40" width="240" height="60" rx="10"/>
    <text class="d-title" x="140" y="66" text-anchor="middle" font-size="13">Title</text>
    <text class="d-label" x="140" y="84" text-anchor="middle" font-size="11">subtitle</text>
    <line class="d-flow thin" x1="260" y1="70" x2="320" y2="70" marker-end="url(#UNIQUE)"/>
    <rect class="d-box accent" x="320" y="40" width="240" height="60" rx="10"/>
    <text class="d-title" x="440" y="70" text-anchor="middle" font-size="13">Highlighted box</text>
  </svg>
  <figcaption>One sentence: the takeaway.</figcaption>
</figure>
```

## Class vocabulary (defined in `beacon.css`)

| Group | Classes | Use for |
|---|---|---|
| Shell | `.site-top` `.brand` (italic wordmark) `.nav-links` `.nav-op` `.next` `.site-foot` `.foot-tag` | The co-brand frame (scaffold above) |
| Hero/text | `.tag` `.sub` `.lede` `.note`(`.red`/`.good`) `.note .k` | Page intro, callouts |
| Blocks | `.card` `.grid` `.grid-3` `table.why` `code` `pre` | Content layout |
| Diagram | `.dgm` · `.d-box`(`.accent` black emphasis / `.ghost` dashed) · `.d-flow`(`.thin`) · `.d-arrow` · `.d-title` `.d-label` `.d-eyebrow` `.d-red` (rare highlight) `.d-good` | Hand-authored SVG, on shared palette |
| Roadmap | `.stage`(`-crawl`/`-walk`/`-run`) `.badge` `.signal` | Stage blocks with accent + gate text |

Convention in diagrams: **solid `.d-box`** = built now (crawl); **`.d-box ghost`**
= planned (walk/run); **`.accent`** (black outline) = the thing to look at. Red
(`.d-red`) is a rare highlight — at most one or two per figure.

## Definition of done (a docs change)
- new/edited page uses the scaffold; `<title>` + `.active` set;
- nav block updated in **all four** pages if pages changed;
- diagrams use `.dgm` + `.d-*` only (no inline hex); each `<figure>` has a caption;
- `.next` cross-links present;
- opened from `file://` on a fresh checkout — renders offline, no console errors,
  nav works. No new JS, no build step, no external font/CDN fetch.
