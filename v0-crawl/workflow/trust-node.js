/**
 * Beacon — Trust Gate  (paste this into the n8n "Trust gate" Code node).
 *
 * This is a faithful, dependency-free mirror of v0-crawl/src/trust/{grounding,evals}.ts,
 * which is unit-tested (`cd v0-crawl && npm test` → 5/5 green). Keep the two in sync:
 * if you change the TS, re-run the tests and re-paste here.
 *
 * Mode: "Run Once for All Items".
 * Input  (one item): { brief, activity }  — brief from "Claude: summarize", activity from "Build activity".
 *   (If the brief arrives as raw text, set briefText and this node will JSON-parse it.)
 * Output (one item): { brief, activity, grounding, eval, pass }
 *   The downstream IF node routes on `pass`: true → render+deliver, false → "Held" (no delivery).
 */

function norm(s) {
  return String(s).trim().toLowerCase().replace(/^#/, "");
}

// A citation resolves to an artifact by exact id, short-SHA prefix, or full URL —
// works for every source (GitHub PR/SHA, Monday/Notion/Slack/Drive id, or a pasted link).
function citationMatches(citation, art) {
  const c = norm(citation);
  const id = norm(art.id);
  if (c === id) return true;
  if (c.length >= 7 && id.startsWith(c)) return true;
  if (id.length >= 7 && c.startsWith(id)) return true;
  if (String(citation).trim() === art.url) return true;
  return false;
}

function checkGrounding(brief, activity) {
  const arts = (activity && activity.artifacts) || [];
  const violations = [];
  let total = 0;
  let grounded = 0;
  for (const section of brief.sections || []) {
    for (const b of section.bullets || []) {
      total++;
      const cites = b.citations || [];
      if (cites.length === 0) {
        violations.push({ section: section.heading, bullet: b.text, reason: "no-citations" });
        continue;
      }
      const unknown = cites.filter((c) => !arts.some((a) => citationMatches(c, a)));
      if (unknown.length > 0) {
        violations.push({ section: section.heading, bullet: b.text, reason: "unknown-citation", detail: unknown.join(", ") });
        continue;
      }
      grounded++;
    }
  }
  return {
    grounded: total > 0 && violations.length === 0,
    totalBullets: total,
    groundedBullets: grounded,
    groundedRatio: total ? grounded / total : 0,
    violations,
  };
}

// Flag impact figures (%, multipliers) in a BD "why it matters" line that aren't in any
// cited artifact — the classic hallucinated-metric failure when summarizing for sales.
function findSpeculativeImpact(brief, activity) {
  const arts = (activity && activity.artifacts) || [];
  const flagged = [];
  for (const section of brief.sections || []) {
    for (const b of section.bullets || []) {
      if (!b.whyItMatters) continue;
      const claims = b.whyItMatters.match(/\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b/gi) || [];
      if (claims.length === 0) continue;
      const cited = arts
        .filter((a) => (b.citations || []).some((c) => citationMatches(c, a)))
        .map((a) => String(a.label).toLowerCase())
        .join(" ");
      for (const claim of claims) if (!cited.includes(claim.toLowerCase())) flagged.push(claim);
    }
  }
  return flagged;
}

const LEAK_PATTERNS = [
  ["api key", /\bsk-[A-Za-z0-9_-]{16,}\b/],
  ["github token", /\bgh[posru]_[A-Za-z0-9]{20,}\b/],
  ["aws key", /\bAKIA[0-9A-Z]{16}\b/],
  ["slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["email (PII)", /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/],
];
function findLeaks(brief) {
  const t = [brief.title || ""];
  for (const s of brief.sections || []) {
    t.push(s.heading || "");
    for (const b of s.bullets || []) {
      t.push(b.text || "");
      if (b.whyItMatters) t.push(b.whyItMatters);
    }
  }
  const text = t.join(" ");
  return LEAK_PATTERNS.filter((p) => p[1].test(text)).map((p) => p[0]);
}

function countWords(brief) {
  const t = [brief.title || ""];
  for (const s of brief.sections || []) {
    t.push(s.heading || "");
    for (const b of s.bullets || []) {
      t.push(b.text || "");
      if (b.whyItMatters) t.push(b.whyItMatters);
    }
  }
  return t.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function scoreBrief(brief, activity, opts) {
  opts = opts || {};
  const floor = opts.floor != null ? opts.floor : 0.8;
  const band = opts.wordBand || [40, 600];
  const minW = band[0];
  const maxW = band[1];
  const W = { grounded: 0.5, structure: 0.2, wordBand: 0.15, noSpeculativeImpact: 0.15 };

  const g = checkGrounding(brief, activity);
  const structure =
    !!String(brief.title || "").trim() &&
    (brief.sections || []).length > 0 &&
    (brief.sections || []).every((s) => (s.bullets || []).length > 0);
  const words = countWords(brief);
  const wordBand = words >= minW && words <= maxW;
  const spec = findSpeculativeImpact(brief, activity);
  const noSpeculativeImpact = spec.length === 0;
  const leaks = findLeaks(brief);
  const noLeakedSecrets = leaks.length === 0;

  const score =
    W.grounded * g.groundedRatio +
    W.structure * (structure ? 1 : 0) +
    W.wordBand * (wordBand ? 1 : 0) +
    W.noSpeculativeImpact * (noSpeculativeImpact ? 1 : 0);

  // Hard gate: never publish (least of all to BD) if ungrounded OR if a "why it matters"
  // line invents an impact figure.
  const pass = g.grounded && noSpeculativeImpact && noLeakedSecrets && score >= floor;

  const notes = [];
  if (!g.grounded) notes.push("grounding: " + g.violations.length + " violation(s)");
  if (!structure) notes.push("structure: empty title/section/bullets");
  if (!wordBand) notes.push("word band: " + words + " not in [" + minW + ", " + maxW + "]");
  if (!noSpeculativeImpact) notes.push("speculative impact: " + spec.join(", "));
  if (!noLeakedSecrets) notes.push("secret/PII leak: " + leaks.join(", "));

  return {
    score: Math.round(score * 100) / 100,
    pass,
    floor,
    checks: {
      structure,
      grounded: g.grounded,
      groundedRatio: Math.round(g.groundedRatio * 100) / 100,
      wordBand,
      words,
      noSpeculativeImpact,
      noLeakedSecrets,
    },
    notes,
  };
}

// ---- n8n entry -----------------------------------------------------------
const incoming = $input.first().json;

// activity comes from the "Build activity" node; allow it inline too.
const activity = incoming.activity || $("Build activity").first().json.activity;

// brief may arrive parsed, as briefText, or as the raw Anthropic Messages response.
let brief = incoming.brief;
if (!brief) {
  let text = incoming.briefText;
  if (!text && incoming.content && incoming.content[0]) text = incoming.content[0].text; // Anthropic shape
  if (!text && incoming.text) text = incoming.text;
  const m = String(text || "").match(/\{[\s\S]*\}/); // first JSON object in the text
  brief = JSON.parse(m ? m[0] : String(text));
}

const grounding = checkGrounding(brief, activity);
const evaluation = scoreBrief(brief, activity);

return [{ json: { brief, activity, grounding, eval: evaluation, pass: evaluation.pass } }];
