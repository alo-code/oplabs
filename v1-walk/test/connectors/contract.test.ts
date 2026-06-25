import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineConnector } from "../../src/connectors/base";
import { ConnectorRegistry } from "../../src/connectors/registry";

// A minimal connector built ONLY from the public contract — the conformance bar every real
// source (GitHub, onchain, Slack, …) must also clear. When a real connector lands, it gets run
// through these same assertions.
const echo = defineConnector({
  name: "echo",
  capabilities: ["read"],
  paramsSchema: z.object({ value: z.string() }),
  resultSchema: z.object({ value: z.string() }),
  fetch: async ({ value }) => ({ value }),
});

describe("connector contract", () => {
  it("exposes name, capabilities, and introspectable zod schemas", () => {
    expect(echo.name).toBe("echo");
    expect(echo.capabilities).toContain("read");
    expect(typeof echo.paramsSchema.parse).toBe("function");
    expect(typeof echo.resultSchema.parse).toBe("function");
  });

  it("parses params in and result out (parse, don't trust)", async () => {
    await expect(echo.fetch({ value: "hi" })).resolves.toEqual({ value: "hi" });
    // a wrong-shaped call is rejected AT THE SEAM, before fetch logic runs
    await expect(echo.fetch({ nope: 1 } as never)).rejects.toBeInstanceOf(z.ZodError);
  });

  it("healthcheck returns the standard envelope", async () => {
    const h = await echo.healthcheck();
    expect(h).toMatchObject({ connector: "echo", ok: true });
    expect(typeof h.checkedAt).toBe("string");
  });

  it("downgrades a throwing healthcheck to ok=false instead of crashing", async () => {
    const flaky = defineConnector({
      name: "flaky",
      paramsSchema: z.object({}),
      resultSchema: z.object({}),
      fetch: async () => ({}),
      healthcheck: async () => {
        throw new Error("auth expired");
      },
    });
    const h = await flaky.healthcheck();
    expect(h).toMatchObject({ connector: "flaky", ok: false, detail: "auth expired" });
  });

  it("registry lists registered connectors with live health", async () => {
    const reg = new ConnectorRegistry().register(echo);
    const list = await reg.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "echo", health: { ok: true } });
  });

  it("registry rejects a duplicate name", () => {
    const reg = new ConnectorRegistry().register(echo);
    expect(() => reg.register(echo)).toThrow(/already registered/);
  });
});
