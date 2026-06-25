import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parseEnv, upsertEnv } from "../../src/core/env";

describe("env parse/upsert", () => {
  it("parses keys, skips comments/blanks, strips quotes", () => {
    const v = parseEnv(["# a comment", "", "GITHUB_TOKEN=ghp_x", 'SLACK_TOKEN="xoxb-y"', "NOTE=has=equals"].join("\n"));
    expect(v).toMatchObject({ GITHUB_TOKEN: "ghp_x", SLACK_TOKEN: "xoxb-y", NOTE: "has=equals" });
    expect(v["# a comment"]).toBeUndefined();
  });

  it("upserts: adds new keys, updates existing, uncomments a placeholder", () => {
    const file = join(tmpdir(), `beacon-env-${randomUUID()}.env`);
    try {
      upsertEnv(file, { NOTION_TOKEN: "secret_1" });
      expect(readFileSync(file, "utf8")).toContain("NOTION_TOKEN=secret_1");
      upsertEnv(file, { NOTION_TOKEN: "secret_2" }); // update
      const after = parseEnv(readFileSync(file, "utf8"));
      expect(after.NOTION_TOKEN).toBe("secret_2");
      expect(Object.keys(after).filter((k) => k === "NOTION_TOKEN")).toHaveLength(1); // no duplicate
    } finally {
      rmSync(file, { force: true });
    }
  });

  it("uncomments a commented placeholder instead of duplicating it", () => {
    const file = join(tmpdir(), `beacon-env-${randomUUID()}.env`);
    try {
      writeFileSync(file, "# SLACK_TOKEN=\nLOG_LEVEL=info\n");
      upsertEnv(file, { SLACK_TOKEN: "xoxb-z" });
      const text = readFileSync(file, "utf8");
      expect(text).toContain("SLACK_TOKEN=xoxb-z");
      expect(text).not.toContain("# SLACK_TOKEN=");
    } finally {
      rmSync(file, { force: true });
    }
  });
});
