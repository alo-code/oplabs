// notion.ts — read recently-edited pages the integration can see (via the search API). Real Notion
// API; token via the central credential registry. No target needed beyond the token, so it's the
// easiest of the three to bring online. Same Artifact shape as every other source.

import { z } from "zod";
import { defineConnector } from "./base";
import { credentials, type CredentialRegistry } from "./credentials";
import { Activity, type Artifact } from "./artifact";
import { defaultFetch, type FetchLike } from "./http";

const NOTION_VERSION = "2022-06-28";

export const NotionParams = z.object({
  query: z.string().optional(), // empty = most-recently-edited pages
  pageSize: z.number().int().positive().max(50).optional(),
});

const NotionPage = z.object({
  id: z.string(),
  url: z.string().optional(),
  object: z.string().optional(),
  properties: z.record(z.any()).optional(),
});
const NotionSearch = z.object({ results: z.array(NotionPage).optional() });

export function makeNotionConnector(opts: { creds?: CredentialRegistry; fetchImpl?: FetchLike } = {}) {
  const creds = opts.creds ?? credentials;
  const doFetch = opts.fetchImpl ?? defaultFetch();
  const token = () => creds.resolve({ connector: "notion", envVar: "NOTION_TOKEN", required: false }).secret?.reveal();
  const headers = (t: string) => ({
    Authorization: `Bearer ${t}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  });

  return defineConnector({
    name: "notion",
    capabilities: ["read:pages"],
    paramsSchema: NotionParams,
    resultSchema: Activity,
    healthcheck: async () => {
      const t = token();
      if (!t) return { ok: false, detail: "no NOTION_TOKEN" };
      const res = await doFetch("https://api.notion.com/v1/users/me", { method: "GET", headers: headers(t) });
      return res.ok ? { ok: true, detail: "token ok" } : { ok: false, detail: `users/me ${res.status}` };
    },
    fetch: async ({ query, pageSize }) => {
      const t = token();
      if (!t) throw new Error("notion: no NOTION_TOKEN configured");
      const body = JSON.stringify({
        query: query ?? "",
        page_size: pageSize ?? 20,
        filter: { property: "object", value: "page" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
      });
      const res = await doFetch("https://api.notion.com/v1/search", { method: "POST", headers: headers(t), body });
      if (!res.ok) throw new Error(`notion search ${res.status}`);
      const parsed = NotionSearch.parse(await res.json());
      const now = new Date().toISOString();
      const artifacts: Artifact[] = (parsed.results ?? []).map((p) => ({
        kind: "page",
        source: "notion",
        id: p.id,
        url: p.url ?? `https://notion.so/${p.id.replace(/-/g, "")}`,
        label: notionTitle(p.properties) ?? "(untitled page)",
      }));
      return { source: "notion", window: { from: now, to: now }, artifacts };
    },
  });
}

/** Notion titles live in whichever property has type "title" — find it and join its rich text. */
function notionTitle(props?: Record<string, unknown>): string | undefined {
  if (!props) return undefined;
  for (const v of Object.values(props)) {
    const prop = v as { type?: string; title?: Array<{ plain_text?: string }> };
    if (prop?.type === "title" && Array.isArray(prop.title)) {
      const text = prop.title.map((x) => x.plain_text ?? "").join("").trim();
      if (text) return text.slice(0, 180);
    }
  }
  return undefined;
}
