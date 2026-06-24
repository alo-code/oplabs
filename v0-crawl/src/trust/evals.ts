// evals.ts — the per-run quality score that gates publishing.
//
// Two hard gates: (1) grounding — an ungrounded brief never passes; (2) no
// speculative impact — a BD "why it matters" line can't invent a figure (e.g.
// "40% faster") that isn't in a cited artifact. On top we score structure + length
// so each run emits an `eval_score` for telemetry. Pure logic — mirrors into n8n.

import type { Activity, Brief } from "./schema";
import { checkGrounding, citationMatches } from "./grounding";

export interface EvalChecks {
  structure: boolean; // title + ≥1 section, every section has ≥1 bullet
  grounded: boolean; // 100% of bullets cite a real artifact
  groundedRatio: number;
  wordBand: boolean; // total words within band (catches empty / runaway output)
  words: number;
  noSpeculativeImpact: boolean; // no uncited %/× figure in any "why it matters" line
}

export interface EvalResult {
  score: number; // 0..1
  pass: boolean; // grounded AND non-speculative AND score ≥ floor
  floor: number;
  checks: EvalChecks;
  notes: string[];
}

const WEIGHTS = { grounded: 0.5, structure: 0.2, wordBand: 0.15, noSpeculativeImpact: 0.15 };

export function scoreBrief(
  brief: Brief,
  activity: Activity,
  opts: { floor?: number; wordBand?: [number, number] } = {},
): EvalResult {
  const floor = opts.floor ?? 0.8;
  const [minWords, maxWords] = opts.wordBand ?? [40, 600];
  const notes: string[] = [];

  const g = checkGrounding(brief, activity);
  if (!g.grounded) notes.push(`grounding: ${g.violations.length} violation(s), ratio ${g.groundedRatio.toFixed(2)}`);

  const structure =
    brief.title.trim().length > 0 &&
    brief.sections.length > 0 &&
    brief.sections.every((s) => s.bullets.length > 0);
  if (!structure) notes.push("structure: empty title, section, or bullet list");

  const words = countWords(brief);
  const wordBand = words >= minWords && words <= maxWords;
  if (!wordBand) notes.push(`word band: ${words} words not in [${minWords}, ${maxWords}]`);

  const speculative = findSpeculativeImpact(brief, activity);
  const noSpeculativeImpact = speculative.length === 0;
  if (!noSpeculativeImpact) {
    notes.push(`speculative impact (uncited figures in a "why it matters" line): ${speculative.join(", ")}`);
  }

  const score =
    WEIGHTS.grounded * g.groundedRatio +
    WEIGHTS.structure * (structure ? 1 : 0) +
    WEIGHTS.wordBand * (wordBand ? 1 : 0) +
    WEIGHTS.noSpeculativeImpact * (noSpeculativeImpact ? 1 : 0);

  // Hard gate: never publish (least of all to BD) if ungrounded OR if a customer-
  // relevance line invents an impact figure.
  const pass = g.grounded && noSpeculativeImpact && score >= floor;

  return {
    score: round(score),
    pass,
    floor,
    checks: { structure, grounded: g.grounded, groundedRatio: round(g.groundedRatio), wordBand, words, noSpeculativeImpact },
    notes,
  };
}

/** Find impact figures (percentages, multipliers) in a BD "why it matters" line
 *  that don't appear in any cited artifact's label — the classic hallucinated-metric
 *  failure when summarizing engineering work for sales. */
function findSpeculativeImpact(brief: Brief, activity: Activity): string[] {
  const flagged: string[] = [];
  for (const section of brief.sections) {
    for (const b of section.bullets) {
      if (!b.whyItMatters) continue;
      const claims = b.whyItMatters.match(/\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b/gi) ?? [];
      if (claims.length === 0) continue;
      const citedText = activity.artifacts
        .filter((a) => b.citations.some((c) => citationMatches(c, a)))
        .map((a) => a.label.toLowerCase())
        .join(" ");
      for (const claim of claims) {
        if (!citedText.includes(claim.toLowerCase())) flagged.push(claim);
      }
    }
  }
  return flagged;
}

function countWords(brief: Brief): number {
  const texts = [
    brief.title,
    ...brief.sections.flatMap((s) => [s.heading, ...s.bullets.flatMap((b) => [b.text, b.whyItMatters ?? ""])]),
  ];
  return texts.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
