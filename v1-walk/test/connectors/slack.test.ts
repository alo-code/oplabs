import { describe, it, expect } from "vitest";
import { makeSlackConnector } from "../../src/connectors/slack";
import { CredentialRegistry } from "../../src/connectors/credentials";
import type { FetchLike } from "../../src/connectors/http";

const history = {
  ok: true,
  messages: [
    { type: "message", ts: "1718900000.000100", user: "U1", text: "shipped fault proofs to mainnet" },
    { type: "message", ts: "1718900100.000200", user: "U2", text: "multi\nline   message" },
  ],
};
const fake = (payload: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => payload, text: async () => "" });

describe("slack connector", () => {
  const creds = new CredentialRegistry({ SLACK_TOKEN: "xoxb-test" });

  it("maps channel messages to grounded artifacts", async () => {
    const slack = makeSlackConnector({ creds, fetchImpl: fake(history) });
    const a = await slack.fetch({ channel: "C123", days: 7 });
    expect(a.source).toBe("slack");
    expect(a.artifacts).toHaveLength(2);
    expect(a.artifacts[0]).toMatchObject({ kind: "message", source: "slack", id: "1718900000.000100" });
    expect(a.artifacts[0]!.url).toContain("/archives/C123/p1718900000000100");
    expect(a.artifacts[1]!.label).not.toContain("\n"); // collapsed to one line
  });

  it("reports not-configured (no network) without a token", async () => {
    const slack = makeSlackConnector({ creds: new CredentialRegistry({}), fetchImpl: fake({}) });
    expect(await slack.healthcheck()).toMatchObject({ ok: false, detail: "no SLACK_TOKEN" });
  });

  it("throws a clear error when no channel is given", async () => {
    const slack = makeSlackConnector({ creds, fetchImpl: fake(history) });
    await expect(slack.fetch({})).rejects.toThrow(/channel/);
  });
});
