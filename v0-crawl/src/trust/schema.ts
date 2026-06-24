// schema.ts — the contract at the n8n → trust-core boundary.
//
// n8n fetches activity from each source (GitHub, Monday, Notion, Slack, Drive) and
// asks Claude for a brief, then hands both to the trust core as JSON. We *parse,
// don't trust* (zod) at that boundary; grounding/evals then work on already-typed
// values, so their logic stays pure and mirrors verbatim into an n8n Code node.

import { z } from "zod";

// One kind per source shape. commit/pr = GitHub · issue = Monday/Linear ·
// page = Notion · message = Slack · file = Drive. Adding a source = add a kind +
// an n8n fetch node; grounding/evals don't change (they key off id + url).
export const ARTIFACT_KINDS = ["commit", "pr", "issue", "page", "message", "file", "onchain"] as const;

/** A real, linkable unit of source activity a brief is allowed to cite. */
export const ArtifactSchema = z.object({
  kind: z.enum(ARTIFACT_KINDS),
  source: z.string().min(1), // "github" | "monday" | "notion" | "slack" | "drive"
  id: z.string().min(1), // SHA · "#412" · "MON-1187" · page id · slack ts · file id
  url: z.string().url(), // the verifiable link — every artifact must be linkable
  label: z.string(), // commit msg · PR/item title · page title · message text · file name
});
export type Artifact = z.infer<typeof ArtifactSchema>;

/** The real activity for the reporting window, across all sources. */
export const ActivitySchema = z.object({
  from: z.string(), // ISO, window start
  to: z.string(), // ISO, window end
  artifacts: z.array(ArtifactSchema),
});
export type Activity = z.infer<typeof ActivitySchema>;

/** One brief bullet. `text` is the technical line (eng digest); `whyItMatters` is
 *  the optional customer-relevance line (BD brief). Both render from this one
 *  grounded item, so the BD framing can't introduce an unsourced claim. */
export const BriefBulletSchema = z.object({
  text: z.string().min(1),
  whyItMatters: z.string().optional(),
  citations: z.array(z.string()), // artifact ids or urls
});
export type BriefBullet = z.infer<typeof BriefBulletSchema>;

export const BriefSectionSchema = z.object({
  heading: z.string().min(1),
  bullets: z.array(BriefBulletSchema),
});
export type BriefSection = z.infer<typeof BriefSectionSchema>;

export const BriefSchema = z.object({
  title: z.string().min(1),
  window: z.object({ from: z.string(), to: z.string() }),
  sections: z.array(BriefSectionSchema),
});
export type Brief = z.infer<typeof BriefSchema>;

export const parseActivity = (u: unknown): Activity => ActivitySchema.parse(u);
export const parseBrief = (u: unknown): Brief => BriefSchema.parse(u);
