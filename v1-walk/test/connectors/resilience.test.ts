import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { withResilience, makeLimiter, isRetryable } from "../../src/connectors/resilience";
import { HttpError } from "../../src/connectors/http";
import { defineConnector } from "../../src/connectors/base";
import { metrics } from "../../src/observability/telemetry";

const noSleep = async () => {};

describe("connector resilience", () => {
  beforeEach(() => metrics.reset());

  it("retries a transient failure (500) then succeeds", async () => {
    let calls = 0;
    const r = await withResilience("x", { retry: { attempts: 3 }, state: makeLimiter(), sleep: noSleep }, async () => {
      calls++;
      if (calls < 3) throw new HttpError(500, "boom");
      return "ok";
    });
    expect(r).toBe("ok");
    expect(calls).toBe(3);
    expect(metrics.snapshot().find((s) => s.name === "connector_retries_total")?.count).toBe(2);
  });

  it("gives up after the attempt budget, rethrowing the last error", async () => {
    let calls = 0;
    await expect(
      withResilience("x", { retry: { attempts: 3 }, state: makeLimiter(), sleep: noSleep }, async () => {
        calls++;
        throw new HttpError(503, "503 service down");
      }),
    ).rejects.toThrow(/503/);
    expect(calls).toBe(3);
  });

  it("does NOT retry a terminal 4xx", async () => {
    let calls = 0;
    await expect(
      withResilience("x", { retry: { attempts: 3 }, state: makeLimiter(), sleep: noSleep }, async () => {
        calls++;
        throw new HttpError(404, "404 not found");
      }),
    ).rejects.toThrow(/404/);
    expect(calls).toBe(1);
  });

  it("classifies retryable vs terminal correctly", () => {
    expect(isRetryable(new HttpError(429, ""))).toBe(true);
    expect(isRetryable(new HttpError(500, ""))).toBe(true);
    expect(isRetryable(new HttpError(404, ""))).toBe(false);
    expect(isRetryable(new z.ZodError([]))).toBe(false);
    expect(isRetryable(new Error("fetch failed"))).toBe(true);
  });

  it("rate-limits: a second rapid call waits ~minInterval", async () => {
    const state = makeLimiter();
    const waits: number[] = [];
    const sleep = async (ms: number) => {
      waits.push(ms);
    };
    const call = () => withResilience("x", { rateLimit: { minIntervalMs: 50 }, state, sleep }, async () => "ok");
    await call();
    await call();
    expect(waits).toHaveLength(1); // first call no wait; second waited
    expect(waits[0]).toBeGreaterThan(0);
    expect(metrics.snapshot().find((s) => s.name === "connector_ratelimited_total")?.count).toBe(1);
  });

  it("defineConnector wires retry into fetch (a flaky connector recovers)", async () => {
    let calls = 0;
    const flaky = defineConnector({
      name: "flaky",
      paramsSchema: z.object({}),
      resultSchema: z.object({ ok: z.boolean() }),
      retry: { attempts: 3, baseDelayMs: 1 },
      fetch: async () => {
        calls++;
        if (calls < 2) throw new HttpError(500, "transient");
        return { ok: true };
      },
    });
    await expect(flaky.fetch({})).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });
});
