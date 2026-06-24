// grounding.ts — the hard trust gate.
//
// Rule: every brief bullet must cite at least one artifact id that actually
// exists in the fetched GitHub activity. This is what stops a hallucinated
// figure from ever reaching a stakeholder — an ungrounded brief is *held*, not
// published. Pure logic (no imports beyond types) so it mirrors into n8n's Code
// node verbatim.

import type { Activity, Brief } from "./schema";

export type GroundingReason = "no-citations" | "unknown-citation";

export interface GroundingViolation {
  section: string;
  bullet: string;
  reason: GroundingReason;
  detail?: string;
}

export interface GroundingResult {
  grounded: boolean; // true iff there is ≥1 bullet and zero violations
  totalBullets: number;
  groundedBullets: number;
  groundedRatio: number;
  violations: GroundingViolation[];
}

export function checkGrounding(brief: Brief, activity: Activity): GroundingResult {
  const known = activity.artifacts.map((a) => normalizeId(a.id));
  const violations: GroundingViolation[] = [];
  let totalBullets = 0;
  let groundedBullets = 0;

  for (const section of brief.sections) {
    for (const bullet of section.bullets) {
      totalBullets++;
      const cites = bullet.citations.map(normalizeId);

      if (cites.length === 0) {
        violations.push({ section: section.heading, bullet: bullet.text, reason: "no-citations" });
        continue;
      }
      const unknown = cites.filter((c) => !isKnown(c, known));
      if (unknown.length > 0) {
        violations.push({
          section: section.heading,
          bullet: bullet.text,
          reason: "unknown-citation",
          detail: unknown.join(", "),
        });
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

/** PRs are cited as "#123"/"123"; commit SHAs may be cited by short prefix. */
function normalizeId(id: string): string {
  return id.trim().toLowerCase().replace(/^#/, "");
}

function isKnown(cite: string, known: string[]): boolean {
  return known.some(
    (k) =>
      k === cite ||
      (cite.length >= 7 && k.startsWith(cite)) || // short SHA cited
      (k.length >= 7 && cite.startsWith(k)), // full SHA cited, short known
  );
}
