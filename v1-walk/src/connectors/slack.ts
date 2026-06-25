// slack.ts — read recent messages from one channel. Real Slack Web API; token via the central
// credential registry (never process.env). Degrades loudly: no token → healthcheck says so, fetch
// throws a clear error. Same Artifact shape as every other source, so it's groundable by v0's gate.

import { z } from "zod";
import { defineConnector } from "./base";
import { credentials, type CredentialRegistry } from "./credentials";
import { Activity, type Artifact } from "./artifact";
import { defaultFetch, HttpError, type FetchLike } from "./http";

export const SlackParams = z.object({
  channel: z.string().min(1).optional(), // channel ID (e.g. C0123ABCD); defaults to SLACK_CHANNEL
  days: z.number().int().positive().max(90).optional(),
});

const SlackMessage = z.object({
  type: z.string().optional(),
  ts: z.string(),
  text: z.string().optional(),
  user: z.string().optional(),
});
const SlackHistory = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  messages: z.array(SlackMessage).optional(),
});

export function makeSlackConnector(opts: { creds?: CredentialRegistry; fetchImpl?: FetchLike } = {}) {
  const creds = opts.creds ?? credentials;
  const doFetch = opts.fetchImpl ?? defaultFetch();
  const token = () => creds.resolve({ connector: "slack", envVar: "SLACK_TOKEN", required: false }).secret?.reveal();
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  return defineConnector({
    name: "slack",
    capabilities: ["read:messages"],
    paramsSchema: SlackParams,
    resultSchema: Activity,
    healthcheck: async () => {
      const t = token();
      if (!t) return { ok: false, detail: "no SLACK_TOKEN" };
      const res = await doFetch("https://slack.com/api/auth.test", { method: "POST", headers: auth(t) });
      const body = (await res.json()) as { ok?: boolean; team?: string; error?: string };
      return body.ok ? { ok: true, detail: `team ${body.team ?? "?"}` } : { ok: false, detail: body.error ?? "auth failed" };
    },
    fetch: async ({ channel, days }) => {
      const t = token();
      if (!t) throw new Error("slack: no SLACK_TOKEN configured");
      const ch = channel ?? process.env.SLACK_CHANNEL;
      if (!ch) throw new Error("slack: set a channel (param) or SLACK_CHANNEL env");
      const oldest = Math.floor((Date.now() - (days ?? 7) * 86_400_000) / 1000);
      const url = `https://slack.com/api/conversations.history?channel=${encodeURIComponent(ch)}&oldest=${oldest}&limit=50`;
      const res = await doFetch(url, { method: "GET", headers: auth(t) });
      if (!res.ok) throw new HttpError(res.status, `slack ${res.status}`); // 429 → retried by the framework
      const parsed = SlackHistory.parse(await res.json());
      if (!parsed.ok) throw new Error(`slack conversations.history: ${parsed.error ?? "error"}`);
      const artifacts: Artifact[] = (parsed.messages ?? [])
        .filter((m) => m.text && (m.type ?? "message") === "message")
        .map((m) => ({
          kind: "message",
          source: "slack",
          id: m.ts,
          url: `https://slack.com/archives/${ch}/p${m.ts.replace(".", "")}`,
          label: oneLine(m.text!, m.user),
        }));
      return { source: "slack", window: { from: new Date(oldest * 1000).toISOString(), to: new Date().toISOString() }, artifacts };
    },
  });
}

function oneLine(text: string, user?: string): string {
  const t = text.replace(/\s+/g, " ").trim().slice(0, 180);
  return user ? `${user}: ${t}` : t;
}
