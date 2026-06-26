// http.ts — the shared fetch seam for connectors that call HTTP/JSON APIs.
//
// One injectable `FetchLike` so every connector can be unit-tested with a canned response and no
// network. Kept tiny on purpose: connectors do their own zod parsing, so this is just the transport.

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export function defaultFetch(): FetchLike {
  return (url, init) => fetch(url, init as RequestInit);
}

export async function readError(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

/** Carries the HTTP status so the resilience layer can tell transient (429/5xx) from terminal (4xx). */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** A deterministic failure that retrying cannot fix — missing credential/target, or an API saying
 *  "no" at the application level (Slack ok:false, Monday GraphQL errors). The resilience layer fails
 *  these fast instead of backing off 3× and polluting the retry telemetry. */
export class TerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerminalError";
  }
}
