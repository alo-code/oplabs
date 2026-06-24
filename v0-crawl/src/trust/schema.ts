// schema.ts — the contract at the n8n → trust-core boundary.
//
// n8n fetches GitHub activity and asks Claude for a brief, then hands both to
// the trust core as JSON. We *parse, don't trust* (zod) at that boundary; the
// grounding/evals functions then work on already-typed values, so their logic
// stays pure and can be mirrored verbatim into an n8n Code node.

import { z } from "zod";

/** A real unit of source activity a brief is allowed to cite. */
export const ArtifactSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("commit"),
    id: z.string(), // commit SHA (may be cited by short prefix)
    repo: z.string(),
    message: z.string(),
    url: z.string().url().optional(),
  }),
  z.object({
    kind: z.literal("pr"),
    id: z.string(), // "#123"
    repo: z.string(),
    title: z.string(),
    url: z.string().url().optional(),
  }),
]);
export type Artifact = z.infer<typeof ArtifactSchema>;

/** The real GitHub activity for the reporting window. */
export const ActivitySchema = z.object({
  repos: z.array(z.string()).min(1),
  from: z.string(), // ISO timestamp, window start
  to: z.string(), // ISO timestamp, window end
  artifacts: z.array(ArtifactSchema),
});
export type Activity = z.infer<typeof ActivitySchema>;

/** One brief bullet, with the artifact ids it claims to be grounded in. */
export const BriefBulletSchema = z.object({
  text: z.string().min(1),
  citations: z.array(z.string()), // artifact ids, e.g. ["a1b2c3d", "#412"]
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
