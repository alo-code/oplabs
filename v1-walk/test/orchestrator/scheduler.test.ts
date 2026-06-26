import { describe, it, expect } from "vitest";
import { parseInterval, startScheduler } from "../../src/orchestrator/scheduler";

describe("scheduler", () => {
  it("parses human intervals; off/blank/garbage disable it", () => {
    expect(parseInterval("20s")).toBe(20_000);
    expect(parseInterval("5m")).toBe(300_000);
    expect(parseInterval("1h")).toBe(3_600_000);
    expect(parseInterval("daily")).toBe(24 * 3600 * 1000);
    expect(parseInterval("weekly")).toBe(7 * 24 * 3600 * 1000);
    expect(parseInterval("off")).toBeNull();
    expect(parseInterval("")).toBeNull();
    expect(parseInterval(undefined)).toBeNull();
    expect(parseInterval("nonsense")).toBeNull();
  });

  it("fires the tick and records lastRunAt + ticks", async () => {
    let fired = 0;
    let timerFn: () => void = () => {};
    const clock = 1000;
    const state = startScheduler(50, async () => { fired++; }, { now: () => clock, setTimer: (fn) => { timerFn = fn; } });
    expect(state.nextRunAt).toBe(clock + 50);
    expect(state.running).toBe(false);

    timerFn(); // simulate the interval firing
    await new Promise((r) => setTimeout(r, 0));
    expect(fired).toBe(1);
    expect(state.lastRunAt).toBe(clock);
    expect(state.ticks).toBe(1);
  });

  it("does not overlap a still-running tick", async () => {
    let active = 0;
    let maxActive = 0;
    let timerFn: () => void = () => {};
    let release!: () => void;
    const tick = async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((r) => (release = r));
      active--;
    };
    startScheduler(10, tick, { now: () => 1, setTimer: (fn) => { timerFn = fn; } });
    timerFn(); // start run 1 (blocks on release)
    timerFn(); // would start run 2 — must be skipped while run 1 is in flight
    await Promise.resolve();
    expect(maxActive).toBe(1);
    release();
  });
});
