import { describe, it, expect } from "vitest";
import { makeNotionConnector } from "../../src/connectors/notion";
import { CredentialRegistry } from "../../src/connectors/credentials";
import type { FetchLike } from "../../src/connectors/http";

const search = {
  results: [
    { id: "abc-123", url: "https://notion.so/abc123", properties: { Name: { type: "title", title: [{ plain_text: "Q3 Roadmap" }] } } },
    { id: "def-456", properties: { Title: { type: "title", title: [{ plain_text: "Deal: Acme" }] } } },
  ],
};
const fake = (payload: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => payload, text: async () => "" });

describe("notion connector", () => {
  const creds = new CredentialRegistry({ NOTION_TOKEN: "secret_x" });

  it("maps pages to artifacts, extracting the title property", async () => {
    const n = makeNotionConnector({ creds, fetchImpl: fake(search) });
    const a = await n.fetch({});
    expect(a.artifacts).toHaveLength(2);
    expect(a.artifacts[0]).toMatchObject({ kind: "page", source: "notion", id: "abc-123", label: "Q3 Roadmap" });
    expect(a.artifacts[1]!.url).toContain("notion.so/def456"); // url synthesized when absent
    expect(a.artifacts[1]!.label).toBe("Deal: Acme");
  });

  it("reports not-configured (no network) without a token", async () => {
    const n = makeNotionConnector({ creds: new CredentialRegistry({}), fetchImpl: fake({}) });
    expect(await n.healthcheck()).toMatchObject({ ok: false, detail: "no NOTION_TOKEN" });
  });
});
