// gate.ts — the trust gate for the executive summary (v1's port of v0's grounding + evals).
//
// v0 proved "trust" as an n8n Code node: every brief bullet must cite a real artifact, no line may
// invent a figure, no secret may leak. v1's exec summary is grounded BY CONSTRUCTION (each bullet IS
// a real artifact), so this gate's jobs are: (1) formalize + score that property, (2) police the LLM
// NARRATIVE — free text that CAN hallucinate a metric — and (3) refuse to publish on any hard
// violation, exactly like v0. The production shape is the shared HTTP "trust service" every workflow
// calls; here it's the same logic as an in-process module (graduating from v0's Code node).

import type { Report } from "../agents/exec-summary/summary";

export interface TrustChecks {
  structure: boolean;
  grounded: boolean; // 100% of bullets cite a real artifact present in memory
  groundedRatio: number;
  noFabricatedFigures: boolean; // the narrative invents no uncited %/× figure
  noLeakedSecrets: boolean;
}
export interface TrustVerdict {
  published: boolean; // passed the gate → safe to show
  score: number; // 0..1
  floor: number;
  checks: TrustChecks;
  violations: string[];
  heldReason?: string; // set when not published
}

const WEIGHTS = { grounded: 0.5, structure: 0.25, noFabricatedFigures: 0.25 };

// Patterns that strongly indicate a leaked secret — must never reach a published brief.
const LEAK_PATTERNS: Array<[string, RegExp]> = [
  ["api key", /\bsk-[A-Za-z0-9_-]{16,}\b/],
  ["github token", /\bgh[posru]_[A-Za-z0-9]{20,}\b/],
  ["aws key", /\bAKIA[0-9A-Z]{16}\b/],
  ["slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

export function gateReport(report: Report, validArtifactIds: Set<string>, opts: { floor?: number } = {}): TrustVerdict {
  const floor = opts.floor ?? 0.8;
  const violations: string[] = [];

  const bullets = report.sections.flatMap((s) => s.bullets);
  const total = bullets.length;
  const groundedCount = bullets.filter((b) => validArtifactIds.has(b.id) || validArtifactIds.has(b.url)).length;
  const groundedRatio = total === 0 ? 0 : groundedCount / total;
  const grounded = total > 0 && groundedCount === total;
  if (!grounded) violations.push(`grounding: ${total - groundedCount}/${total} bullet(s) cite an artifact not in memory`);

  const structure = report.sections.length > 0 && report.sections.every((s) => s.bullets.length > 0);
  if (!structure) violations.push("structure: no sections, or a section has no bullets");

  const fabricated = findFabricatedFigures(report);
  const noFabricatedFigures = fabricated.length === 0;
  if (!noFabricatedFigures) violations.push(`fabricated figure(s) in the narrative, uncited: ${fabricated.join(", ")}`);

  const leaks = findLeaks(report);
  const noLeakedSecrets = leaks.length === 0;
  if (!noLeakedSecrets) violations.push(`possible secret leak: ${leaks.join(", ")}`);

  const score =
    WEIGHTS.grounded * groundedRatio +
    WEIGHTS.structure * (structure ? 1 : 0) +
    WEIGHTS.noFabricatedFigures * (noFabricatedFigures ? 1 : 0);

  // Hard gate: never publish if ungrounded, if the narrative invents a figure, or if a secret leaks —
  // regardless of score. (A report that scores 0.85 is still refused if it fabricates a metric.)
  const published = grounded && noFabricatedFigures && noLeakedSecrets && score >= floor;
  const heldReason = published ? undefined : (violations[0] ?? `score ${round(score)} below floor ${floor}`);

  return {
    published,
    score: round(score),
    floor,
    checks: { structure, grounded, groundedRatio: round(groundedRatio), noFabricatedFigures, noLeakedSecrets },
    violations,
    heldReason,
  };
}

/** Figures (%, ×/x) in the narrative that appear in NO bullet text (i.e. no cited artifact). */
function findFabricatedFigures(report: Report): string[] {
  if (!report.narrative) return [];
  const claims = report.narrative.match(/\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b/gi) ?? [];
  if (!claims.length) return [];
  const corpus = report.sections
    .flatMap((s) => s.bullets.map((b) => b.text))
    .join(" ")
    .toLowerCase();
  return claims.filter((c) => !corpus.includes(c.toLowerCase()));
}

function findLeaks(report: Report): string[] {
  const text = [report.title, report.narrative ?? "", ...report.sections.flatMap((s) => [s.heading, ...s.bullets.map((b) => b.text)])].join(" ");
  return LEAK_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
