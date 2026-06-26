import { describe, it, expect } from "vitest";
import { redactText, redactPayload, PolicyStore } from "../../src/memory/policy";
import { InMemoryStore } from "../../src/memory/inmemory";

describe("memory governance policy", () => {
  it("redacts emails, secrets, and phone numbers", () => {
    expect(redactText("ping jane.doe@acme.com").text).toBe("ping [redacted-email]");
    expect(redactText("key sk-ant-abcdefghijklmnop123").text).toContain("[redacted-secret]");
    expect(redactText("call +1-555-867-5309").text).toContain("[redacted-phone]");
  });

  it("does NOT redact plain numbers (e.g. onchain block heights)", () => {
    const t = "OP Mainnet block 153384327 — 58 txns";
    expect(redactText(t).changed).toBe(false);
    expect(redactText(t).text).toBe(t);
  });

  it("flags a payload when it redacts something", () => {
    const clean = redactPayload({ label: "feat: fault proofs" });
    expect(clean.redacted).toBe(false);
    const dirty = redactPayload({ label: "contact jane@acme.com", url: "u" });
    expect(dirty.redacted).toBe(true);
    expect((dirty.payload as { label: string; redacted: boolean }).label).toContain("[redacted-email]");
    expect((dirty.payload as { redacted: boolean }).redacted).toBe(true);
  });

  it("PolicyStore redacts on write (the email never reaches the inner store)", async () => {
    const store = new PolicyStore(new InMemoryStore());
    await store.store({ key: "k", source: "slack", sourceId: "1", payload: { label: "Acme lead: jane@acme.com", id: "1", url: "u" } });
    const [item] = await store.recall();
    expect((item!.payload as { label: string }).label).toContain("[redacted-email]");
    expect((item!.payload as { label: string }).label).not.toContain("jane@acme.com");
  });

  it("TTL drops items older than the window on recall", async () => {
    const store = new PolicyStore(new InMemoryStore(), { ttlMs: 60_000 });
    await store.store({ key: "k", source: "s", sourceId: "old", createdAt: new Date(Date.now() - 120_000).toISOString(), payload: {} });
    await store.store({ key: "k", source: "s", sourceId: "new", payload: {} });
    const ids = (await store.recall()).map((i) => i.sourceId);
    expect(ids).toContain("new");
    expect(ids).not.toContain("old");
  });
});
