// monday.ts — read items from a board (the deal pipeline use-case). Real Monday GraphQL API; token
// via the central credential registry. Monday's auth header is the bare token (no "Bearer"). Same
// Artifact shape; the natural source for the deal decision-log / prospect-intel workflows.

import { z } from "zod";
import { defineConnector } from "./base";
import { credentials, type CredentialRegistry } from "./credentials";
import { Activity, type Artifact } from "./artifact";
import { defaultFetch, type FetchLike } from "./http";

export const MondayParams = z.object({
  boardId: z.union([z.string(), z.number()]).optional(), // defaults to MONDAY_BOARD_ID
  limit: z.number().int().positive().max(50).optional(),
});

const MondayItem = z.object({ id: z.string(), name: z.string() });
const MondayResp = z.object({
  data: z
    .object({
      boards: z
        .array(z.object({ id: z.string().optional(), name: z.string().optional(), items_page: z.object({ items: z.array(MondayItem) }).optional() }))
        .optional(),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

export function makeMondayConnector(opts: { creds?: CredentialRegistry; fetchImpl?: FetchLike } = {}) {
  const creds = opts.creds ?? credentials;
  const doFetch = opts.fetchImpl ?? defaultFetch();
  const token = () => creds.resolve({ connector: "monday", envVar: "MONDAY_TOKEN", required: false }).secret?.reveal();
  const headers = (t: string) => ({ Authorization: t, "Content-Type": "application/json", "API-Version": "2023-10" });

  async function gql(t: string, query: string): Promise<unknown> {
    const res = await doFetch("https://api.monday.com/v2", { method: "POST", headers: headers(t), body: JSON.stringify({ query }) });
    if (!res.ok) throw new Error(`monday ${res.status}`);
    return res.json();
  }

  return defineConnector({
    name: "monday",
    capabilities: ["read:items"],
    paramsSchema: MondayParams,
    resultSchema: Activity,
    healthcheck: async () => {
      const t = token();
      if (!t) return { ok: false, detail: "no MONDAY_TOKEN" };
      try {
        const r = (await gql(t, "{ me { name } }")) as { data?: { me?: { name?: string } } };
        return r.data?.me ? { ok: true, detail: `as ${r.data.me.name}` } : { ok: false, detail: "auth failed" };
      } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "error" };
      }
    },
    fetch: async ({ boardId, limit }) => {
      const t = token();
      if (!t) throw new Error("monday: no MONDAY_TOKEN configured");
      const board = String(boardId ?? process.env.MONDAY_BOARD_ID ?? "");
      if (!board) throw new Error("monday: set a boardId (param) or MONDAY_BOARD_ID env");
      const query = `{ boards(ids: [${board}]) { id name items_page(limit: ${limit ?? 20}) { items { id name } } } }`;
      const parsed = MondayResp.parse(await gql(t, query));
      if (parsed.errors?.length) throw new Error(`monday: ${parsed.errors[0]!.message}`);
      const items = parsed.data?.boards?.[0]?.items_page?.items ?? [];
      const now = new Date().toISOString();
      const artifacts: Artifact[] = items.map((it) => ({
        kind: "item",
        source: "monday",
        id: it.id,
        url: `https://monday.com/boards/${board}/pulses/${it.id}`,
        label: it.name.slice(0, 180),
      }));
      return { source: "monday", window: { from: now, to: now }, artifacts };
    },
  });
}
