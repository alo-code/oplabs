// scheduler.ts — the "always-on" half: run the brief on a schedule, not just a button (pain ②).
//
// A tiny interval scheduler in the control-plane process. Configured by BEACON_SCHEDULE
// ("20s" / "5m" / "1h" / "daily" / "weekly" / "off"); `./beacon demo` sets a short interval so the
// page comes alive on its own. No cron daemon, no extra process — the smallest thing that proves the
// platform doesn't sleep when you stop clicking. (The production form is a real job runner; same seam.)

export interface SchedulerState {
  intervalMs: number;
  lastRunAt: number | null;
  nextRunAt: number | null;
  running: boolean;
  ticks: number;
}

/** Parse a human interval to ms. Returns null for "off"/empty/unparseable (scheduling disabled). */
export function parseInterval(spec: string | undefined): number | null {
  const s = (spec ?? "").trim().toLowerCase();
  if (!s || s === "off" || s === "0") return null;
  if (s === "weekly") return 7 * 24 * 3600 * 1000;
  if (s === "daily") return 24 * 3600 * 1000;
  const m = s.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const mult = m[2] === "s" ? 1000 : m[2] === "m" ? 60_000 : m[2] === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

/** Start firing `tick` every intervalMs (no overlap). `initialDelayMs` fires a first run sooner so a
 *  demo populates quickly. `now`/`setTimer` are injectable for tests. */
export function startScheduler(
  intervalMs: number,
  tick: () => Promise<void>,
  opts: {
    initialDelayMs?: number;
    now?: () => number;
    setTimer?: (fn: () => void, ms: number) => void;
  } = {},
): SchedulerState {
  const now = opts.now ?? (() => Date.now());
  const setTimer = opts.setTimer ?? ((fn, ms) => setInterval(fn, ms).unref?.());
  const firstIn = opts.initialDelayMs ?? intervalMs;
  const state: SchedulerState = { intervalMs, lastRunAt: null, nextRunAt: now() + firstIn, running: false, ticks: 0 };

  const run = async (): Promise<void> => {
    if (state.running) return; // never overlap a slow run with the next tick
    state.running = true;
    try {
      await tick();
      state.lastRunAt = now();
      state.ticks++;
    } catch {
      // tick logs its own errors; the scheduler keeps going
    } finally {
      state.running = false;
      state.nextRunAt = now() + intervalMs;
    }
  };

  if (opts.initialDelayMs != null && opts.setTimer) opts.setTimer(() => void run(), opts.initialDelayMs);
  else if (opts.initialDelayMs != null) setTimeout(() => void run(), opts.initialDelayMs).unref?.();
  setTimer(() => void run(), intervalMs);
  return state;
}
