// github.ts — the first real connector. Real calls, NOT mocked, and zero-key by default:
// GitHub's public-repo commits API needs no token (a PAT only lifts the rate limit). Credentials
// (when present) come from the central registry, never process.env, and never reach a log.

import { z } from "zod";
import { defineConnector } from "./base";
import { credentials, type CredentialRegistry } from "./credentials";
import { Activity, type Artifact } from "./artifact";

export const GitHubParams = z.object({
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/, "repo must be owner/name"),
  days: z.number().int().positive().max(90).optional(),
});

// A minimal, defensive view of the GitHub commits API — parse, don't trust the whole payload.
const GitHubCommit = z.object({
  sha: z.string(),
  html_url: z.string(),
  commit: z.object({ message: z.string() }),
});

/** The subset of `fetch` we use — lets a test inject a canned response with no network. */
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export function makeGitHubConnector(opts: { creds?: CredentialRegistry; fetchImpl?: FetchLike } = {}) {
  const creds = opts.creds ?? credentials;
  const doFetch: FetchLike = opts.fetchImpl ?? ((url, init) => fetch(url, init));

  return defineConnector({
    name: "github",
    capabilities: ["read:commits"],
    paramsSchema: GitHubParams,
    resultSchema: Activity,
    healthcheck: async () => {
      const res = await doFetch("https://api.github.com/rate_limit", { headers: headers(creds) });
      if (!res.ok) return { ok: false, detail: `rate_limit ${res.status}` };
      const body = (await res.json()) as { rate?: { remaining?: number } };
      return { ok: true, detail: `rate-limit remaining ${body.rate?.remaining ?? "?"}` };
    },
    fetch: async ({ repo, days }) => {
      const to = new Date();
      const from = new Date(to.getTime() - (days ?? 7) * 86_400_000);
      const url =
        `https://api.github.com/repos/${repo}/commits` +
        `?since=${from.toISOString()}&until=${to.toISOString()}&per_page=50`;
      const res = await doFetch(url, { headers: headers(creds) });
      if (!res.ok) throw new Error(`github commits ${res.status}: ${await safeText(res)}`);
      const raw = z.array(GitHubCommit).parse(await res.json());
      const artifacts: Artifact[] = raw.map((c) => ({
        kind: "commit",
        source: "github",
        id: c.sha,
        url: c.html_url,
        label: firstLine(c.commit.message),
      }));
      return { source: "github", window: { from: from.toISOString(), to: to.toISOString() }, artifacts };
    },
  });
}

function headers(creds: CredentialRegistry): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "beacon-walk",
  };
  // Optional: public repos work without it. Resolved centrally; revealed only here, at the boundary.
  const cred = creds.resolve({ connector: "github", envVar: "GITHUB_TOKEN", required: false });
  if (cred.secret) h.Authorization = `Bearer ${cred.secret.reveal()}`;
  return h;
}

function firstLine(s: string): string {
  return s.split("\n")[0]!.slice(0, 200);
}
async function safeText(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}
