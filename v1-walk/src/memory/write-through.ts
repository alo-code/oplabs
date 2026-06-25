// write-through.ts — persist a connector's Activity into shared memory.
//
// This is the seam where "context re-fetched per task" (pain ①) and "no shared memory" (pain ④)
// both get fixed: a connector fetches once, write-through stores each artifact keyed by its source
// id, and any agent can recall it later instead of re-fetching. Idempotent — re-running dedups.

import type { Activity } from "../connectors/artifact";
import type { MemoryStore } from "./store";

export interface WriteThroughResult {
  total: number;
  stored: number;
  deduped: number;
}

export async function writeThrough(
  store: MemoryStore,
  agent: string,
  key: string,
  activity: Activity,
): Promise<WriteThroughResult> {
  let stored = 0;
  let deduped = 0;
  for (const a of activity.artifacts) {
    const r = await store.store({ key, source: a.source, sourceId: a.id, agent, payload: a });
    if (r.stored) stored++;
    else deduped++;
  }
  return { total: activity.artifacts.length, stored, deduped };
}
