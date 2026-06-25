import { describe, it, expect } from "vitest";
import { fixtureRegistry } from "../../src/connectors/fixtures";
import { Activity } from "../../src/connectors/artifact";

describe("fixture registry (demo runthrough)", () => {
  it("registers all 5 sources; the 3 fixture sources are healthy without real creds", async () => {
    const reg = fixtureRegistry();
    expect(reg.names().sort()).toEqual(["github", "monday", "notion", "onchain", "slack"]);
    // probe only the fixture sources (avoids github/onchain network in the test)
    expect((await reg.get("slack")!.healthcheck()).ok).toBe(true);
    expect((await reg.get("notion")!.healthcheck()).ok).toBe(true);
    expect((await reg.get("monday")!.healthcheck()).ok).toBe(true);
  });

  it("fixture fetches map to grounded artifacts through the real connector code", async () => {
    const reg = fixtureRegistry();
    const slack = Activity.parse(await reg.get("slack")!.fetch({ channel: "C-GTM-SHIPPED" }));
    const monday = Activity.parse(await reg.get("monday")!.fetch({}));
    const notion = Activity.parse(await reg.get("notion")!.fetch({}));
    expect(slack.artifacts.length).toBeGreaterThan(0);
    expect(monday.artifacts.some((a) => /Acme/.test(a.label))).toBe(true);
    expect(notion.artifacts.some((a) => /Upgrade 19/.test(a.label))).toBe(true);
    // every fixture artifact is groundable (has id + url), same shape as live sources
    for (const a of [...slack.artifacts, ...monday.artifacts, ...notion.artifacts]) {
      expect(a.id).toBeTruthy();
      expect(a.url).toMatch(/^https?:/);
    }
  });
});
