import { describe, it, expect } from "vitest";
import { makeGitHubConnector, type FetchLike } from "../../src/connectors/github";
import { CredentialRegistry } from "../../src/connectors/credentials";

// A canned GitHub commits payload — so the MAPPING is tested offline/deterministically. The real
// network call is exercised by `npm run connectors` (evidence), mirroring v0's tested-core + demo split.
const commitsPayload = [
  { sha: "abc1234def5678", html_url: "https://github.com/o/r/commit/abc1234def5678", commit: { message: "feat: add fault proofs\n\nbody" } },
  { sha: "99887766aabbcc", html_url: "https://github.com/o/r/commit/99887766aabbcc", commit: { message: "fix: gas accounting" } },
];

function fakeFetch(payload: unknown, ok = true, status = 200): FetchLike {
  return async () => ({ ok, status, json: async () => payload, text: async () => JSON.stringify(payload) });
}

describe("github connector", () => {
  it("maps commits to grounded artifacts (id=sha, first line as label)", async () => {
    const gh = makeGitHubConnector({ creds: new CredentialRegistry({}), fetchImpl: fakeFetch(commitsPayload) });
    const activity = await gh.fetch({ repo: "ethereum-optimism/optimism", days: 7 });

    expect(activity.source).toBe("github");
    expect(activity.artifacts).toHaveLength(2);
    expect(activity.artifacts[0]).toMatchObject({
      kind: "commit",
      source: "github",
      id: "abc1234def5678",
      url: "https://github.com/o/r/commit/abc1234def5678",
      label: "feat: add fault proofs", // first line only
    });
    expect(new Date(activity.window.from).getTime()).toBeLessThan(new Date(activity.window.to).getTime());
  });

  it("rejects a malformed repo at the seam (parse, don't trust)", async () => {
    const gh = makeGitHubConnector({ fetchImpl: fakeFetch(commitsPayload) });
    await expect(gh.fetch({ repo: "not-a-repo" })).rejects.toBeTruthy();
  });

  it("throws a readable error on a non-OK response", async () => {
    const gh = makeGitHubConnector({ fetchImpl: fakeFetch({ message: "Not Found" }, false, 404) });
    await expect(gh.fetch({ repo: "o/r" })).rejects.toThrow(/github commits 404/);
  });

  it("works with NO token (public repos) — no Authorization required", async () => {
    let sawAuth = true;
    const spyFetch: FetchLike = async (_url, init) => {
      sawAuth = "Authorization" in (init?.headers ?? {});
      return { ok: true, status: 200, json: async () => commitsPayload, text: async () => "" };
    };
    const gh = makeGitHubConnector({ creds: new CredentialRegistry({}), fetchImpl: spyFetch });
    await gh.fetch({ repo: "o/r" });
    expect(sawAuth).toBe(false);
  });
});
