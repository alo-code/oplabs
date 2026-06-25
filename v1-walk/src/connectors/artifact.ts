// artifact.ts — the groundable unit, shared by every connector.
//
// Intentionally identical to v0's trust-core Artifact ({kind, source, id, url, label}). That's the
// "separate but interoperable" point made concrete: anything a v1 connector fetches can be cited by
// v0's grounding gate without translation. A new source just enlarges the citable pool.

import { z } from "zod";

export const Artifact = z.object({
  kind: z.string(),
  source: z.string(),
  id: z.string(),
  url: z.string(),
  label: z.string(),
});
export type Artifact = z.infer<typeof Artifact>;

/** What every connector returns: a source name, the window it covers, and the artifacts found. */
export const Activity = z.object({
  source: z.string(),
  window: z.object({ from: z.string(), to: z.string() }),
  artifacts: z.array(Artifact),
});
export type Activity = z.infer<typeof Activity>;
