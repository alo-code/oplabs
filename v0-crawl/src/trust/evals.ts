// evals.ts — the per-run quality score that gates publishing.
//
// Grounding is the hard gate (an ungrounded brief never passes). On top of it
// we score structure and length so the run also emits an `eval_score` for the
// telemetry the case study asks for. Pure logic — mirrors into the n8n Code node.

import type { Activity, Brief } from "./schema";
import { checkGrounding } from "./grounding";

export interface EvalChecks {
  structure: boolean; // title + ≥1 section, every section has ≥1 bullet
  grounded: boolean; // 100% of bullets cite a real artifact
  groundedRatio: number;
  wordBand: boolean; // total words within band (catches empty / runaway output)
  words: number;
}

export interface EvalResult {
  score: number; // 0..1
  pass: boolean; // grounded AND score ≥ floor
  floor: number;
  checks: EvalChecks;
  notes: string[];
}

const WEIGHTS = { grounded: 0.55, structure: 0.25, wordBand: 0.2 };

export function scoreBrief(
  brief: Brief,
  activity: Activity,
  opts: { floor?: number; wordBand?: [number, number] } = {},
): EvalResult {
  const floor = opts.floor ?? 0.8;
  const [minWords, maxWords] = opts.wordBand ?? [40, 600];
  const notes: string[] = [];

  const g = checkGrounding(brief, activity);
  if (!g.grounded) {
    notes.push(`grounding: ${g.violations.length} violation(s), ratio ${g.groundedRatio.toFixed(2)}`);
  }

  const structure =
    brief.title.trim().length > 0 &&
    brief.sections.length > 0 &&
    brief.sections.every((s) => s.bullets.length > 0);
  if (!structure) notes.push("structure: empty title, section, or bullet list");

  const words = countWords(brief);
  const wordBand = words >= minWords && words <= maxWords;
  if (!wordBand) notes.push(`word band: ${words} words not in [${minWords}, ${maxWords}]`);

  const score =
    WEIGHTS.grounded * g.groundedRatio +
    WEIGHTS.structure * (structure ? 1 : 0) +
    WEIGHTS.wordBand * (wordBand ? 1 : 0);

  // Hard gate: a brief that isn't fully grounded never passes, whatever the score.
  const pass = g.grounded && score >= floor;

  return {
    score: round(score),
    pass,
    floor,
    checks: {
      structure,
      grounded: g.grounded,
      groundedRatio: round(g.groundedRatio),
      wordBand,
      words,
    },
    notes,
  };
}

function countWords(brief: Brief): number {
  const texts = [
    brief.title,
    ...brief.sections.flatMap((s) => [s.heading, ...s.bullets.map((b) => b.text)]),
  ];
  return texts.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
