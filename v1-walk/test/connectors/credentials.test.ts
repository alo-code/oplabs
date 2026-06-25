import { describe, it, expect, beforeEach } from "vitest";
import { CredentialRegistry, Secret } from "../../src/connectors/credentials";
import { metrics } from "../../src/observability/telemetry";

describe("credential registry", () => {
  beforeEach(() => metrics.reset());

  it("resolves a present credential and reveals it only via .reveal()", () => {
    const reg = new CredentialRegistry({ GITHUB_TOKEN: "ghp_supersecret_123" });
    const h = reg.resolve({ connector: "github", envVar: "GITHUB_TOKEN", required: false });
    expect(h.present).toBe(true);
    expect(h.secret?.reveal()).toBe("ghp_supersecret_123");
  });

  it("NEVER serializes the raw secret value (the whole point)", () => {
    const reg = new CredentialRegistry({ GITHUB_TOKEN: "ghp_supersecret_123" });
    const h = reg.resolve({ connector: "github", envVar: "GITHUB_TOKEN", required: false });
    expect(JSON.stringify(h)).not.toContain("ghp_supersecret_123");
    expect(String(h.secret)).toBe("[redacted]");
    expect(`${h.secret}`).toBe("[redacted]");
    expect(JSON.stringify(h.secret)).toBe('"[redacted]"');
  });

  it("reports absence and warns only when the credential is required", () => {
    const reg = new CredentialRegistry({}); // empty env
    const optional = reg.resolve({ connector: "github", envVar: "GITHUB_TOKEN", required: false });
    expect(optional.present).toBe(false);
    expect(optional.secret).toBeUndefined();

    const required = reg.resolve({ connector: "slack", envVar: "SLACK_TOKEN", required: true });
    expect(required.present).toBe(false);

    const samples = metrics.snapshot();
    const absent = samples.find(
      (s) => s.name === "credential_resolutions_total" && s.labels.connector === "slack",
    );
    expect(absent?.labels.result).toBe("absent");
  });

  it("treats a whitespace-only value as absent", () => {
    const reg = new CredentialRegistry({ GITHUB_TOKEN: "   " });
    const h = reg.resolve({ connector: "github", envVar: "GITHUB_TOKEN", required: false });
    expect(h.present).toBe(false);
  });

  it("a bare Secret also refuses to leak", () => {
    const s = new Secret("top-secret");
    expect(JSON.stringify({ s })).toBe('{"s":"[redacted]"}');
    expect(s.reveal()).toBe("top-secret");
  });
});
