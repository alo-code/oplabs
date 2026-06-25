import { describe, it, expect } from "vitest";
import { SERVICES, serviceBySource, envVarsFor } from "../../src/core/services";

describe("services catalog", () => {
  it("lists the connectable services", () => {
    expect(SERVICES.map((s) => s.source).sort()).toEqual(["anthropic", "github", "monday", "notion", "slack"]);
  });

  it("maps a service to env vars (token + optional target)", () => {
    expect(envVarsFor(serviceBySource("slack")!, "xoxb-1", "C123")).toEqual({ SLACK_TOKEN: "xoxb-1", SLACK_CHANNEL: "C123" });
    expect(envVarsFor(serviceBySource("notion")!, "secret_1")).toEqual({ NOTION_TOKEN: "secret_1" });
    expect(envVarsFor(serviceBySource("monday")!, "tok", "42")).toEqual({ MONDAY_TOKEN: "tok", MONDAY_BOARD_ID: "42" });
  });

  it("drops blank tokens and targets", () => {
    expect(envVarsFor(serviceBySource("monday")!, "   ")).toEqual({});
    expect(envVarsFor(serviceBySource("slack")!, "xoxb", "  ")).toEqual({ SLACK_TOKEN: "xoxb" });
  });

  it("returns undefined for an unknown source", () => {
    expect(serviceBySource("nope")).toBeUndefined();
  });

  it("anthropic is not a connector (it's the summarizer)", () => {
    expect(serviceBySource("anthropic")!.isConnector).toBe(false);
    expect(serviceBySource("slack")!.isConnector).toBe(true);
  });
});
