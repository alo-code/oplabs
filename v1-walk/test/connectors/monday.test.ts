import { describe, it, expect } from "vitest";
import { makeMondayConnector } from "../../src/connectors/monday";
import { CredentialRegistry } from "../../src/connectors/credentials";
import type { FetchLike } from "../../src/connectors/http";

const resp = {
  data: { boards: [{ id: "100", name: "Pipeline", items_page: { items: [{ id: "1", name: "Acme deal" }, { id: "2", name: "Globex renewal" }] } }] },
};
const fake = (payload: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => payload, text: async () => "" });

describe("monday connector", () => {
  const creds = new CredentialRegistry({ MONDAY_TOKEN: "ey_test" });

  it("maps board items to grounded artifacts", async () => {
    const m = makeMondayConnector({ creds, fetchImpl: fake(resp) });
    const a = await m.fetch({ boardId: 100 });
    expect(a.source).toBe("monday");
    expect(a.artifacts).toHaveLength(2);
    expect(a.artifacts[0]).toMatchObject({ kind: "item", source: "monday", id: "1", label: "Acme deal" });
    expect(a.artifacts[0]!.url).toContain("/boards/100/pulses/1");
  });

  it("reports not-configured (no network) without a token", async () => {
    const m = makeMondayConnector({ creds: new CredentialRegistry({}), fetchImpl: fake({}) });
    expect(await m.healthcheck()).toMatchObject({ ok: false, detail: "no MONDAY_TOKEN" });
  });

  it("throws a clear error without a board", async () => {
    const m = makeMondayConnector({ creds, fetchImpl: fake(resp) });
    await expect(m.fetch({})).rejects.toThrow(/boardId|MONDAY_BOARD_ID/);
  });
});
