# Skill: applying the cadence (TDD, five stages)

`CADENCE.md` is the contract. This is the how-to for one slice.

## The five stages, concretely (TypeScript)

### 1. Contract
Write the type/interface/schema first — no body.
```ts
// src/connectors/github.ts
export interface GitHubActivity {
  repo: string;
  window: { from: string; to: string }; // ISO
  commits: { sha: string; message: string; author: string }[];
  mergedPRs: { number: number; title: string }[];
}
export async function fetchActivity(repo: string, days: number): Promise<GitHubActivity> {
  throw new Error("not implemented"); // contract only
}
```
Get it reviewed. This is the cheapest place to be wrong.

### 2. Red
```ts
// test/github.test.ts
it("returns activity within the requested window", async () => {
  const a = await fetchActivity("ethereum-optimism/optimism", 7);
  expect(a.commits.length).toBeGreaterThan(0);
  expect(new Date(a.window.from) < new Date(a.window.to)).toBe(true);
});
```
Run `npm test`. Confirm it fails — and fails for the *right* reason
(not-implemented), not a typo.

### 3. Observability (before green)
```ts
metrics.counter("connector_requests_total", { connector: "github" }).inc();
metrics.histogram("connector_latency_ms", { connector: "github" }).observe(ms);
log.info({ repo, days, count: a.commits.length }, "github.fetchActivity");
```
When green lands, the signal is already there to receive it.

### 4. Green
The smallest diff that turns the test green and emits the signal. No
refactors, no "while I'm here." If you're tempted, that's another slice.

### 5. Evidence
```
evidence/exec-brief/1.1/README.md
```
with the real run: the command, the real repo, the real counts, a metric
snapshot. "Tests pass" is stage 2; this is "I ran it and watched it work."

## For agents, "red" is usually an eval
You can't `expect(brief).toBe(...)` on free text. Pin it with assertions on
*structure and grounding* instead: section count, that every claim cites a
real commit SHA/PR number, no empty sections, word-count band. See
`evals-and-observability.md`.

## Collapsing stages (small changes)
A one-line fix still touches all five — they collapse into one commit whose
body names contract/red/obs/green/evidence. If you can't name stages 1–3, the
change may not be needed.

## The one non-collapse: migrations
Store/schema migration = separate commit from the code that uses it, so it can
deploy first. Everything else may be one commit per slice.
