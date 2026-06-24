// grounding.ts — the hard trust gate.
//
// Rule: every brief bullet must cite at least one artifact that actually exists in
// the fetched activity — from ANY source. This is what stops a hallucinated claim
// from reaching a stakeholder; an ungrounded brief is held, not published. Pure
// logic (types-only import) so it mirrors into n8n's Code node verbatim.

import type { Activity, Artifact, Brief } from "./schema";

export type GroundingReason = "no-citations" | "unknown-citation";

export interface GroundingViolation {
  section: string;
  bullet: string;
  reason: GroundingReason;
  detail?: string;
}

export interface GroundingResult {
  grounded: boolean; // true iff ≥1 bullet and zero violations
  totalBullets: number;
  groundedBullets: number;
  groundedRatio: number;
  violations: GroundingViolation[];
}

export function checkGrounding(brief: Brief, activity: Activity): GroundingResult {
  const arts = activity.artifacts;
  const violations: GroundingViolation[] = [];
  let totalBullets = 0;
  let groundedBullets = 0;

  for (const section of brief.sections) {
    for (const bullet of section.bullets) {
      totalBullets++;
      if (bullet.citations.length === 0) {
        violations.push({ section: section.heading, bullet: bullet.text, reason: "no-citations" });
        continue;
      }
      const unknown = bullet.citations.filter((c) => !arts.some((a) => citationMatches(c, a)));
      if (unknown.length > 0) {
        violations.push({ section: section.heading, bullet: bullet.text, reason: "unknown-citation", detail: unknown.join(", ") });
        continue;
      }
      groundedBullets++;
    }
  }

  return {
    grounded: totalBullets > 0 && violations.length === 0,
    totalBullets,
    groundedBullets,
    groundedRatio: totalBullets === 0 ? 0 : groundedBullets / totalBullets,
    violations,
  };
}

/** A citation resolves to an artifact by exact id, short-SHA prefix, or full URL.
 *  Works for every source: a #PR, a commit SHA, a Monday/Notion/Slack/Drive id, or
 *  a pasted link. */
export function citationMatches(citation: string, art: Artifact): boolean {
  const c = norm(citation);
  const id = norm(art.id);
  if (c === id) return true;
  if (c.length >= 7 && id.startsWith(c)) return true; // brief cited a short SHA
  if (id.length >= 7 && c.startsWith(id)) return true; // brief cited the full SHA
  if (citation.trim() === art.url) return true; // brief cited by URL
  return false;
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/^#/, "");
}
