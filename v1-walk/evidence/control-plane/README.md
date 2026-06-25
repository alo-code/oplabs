# Evidence — control plane (W3): a non-engineer surface, real runs

**Captured:** 2026-06-24 · **Command:** `npm run control-plane` then HTTP calls to `localhost:7878`
**Environment:** fresh clone, no `.env`, in-memory store. A non-engineer opens the page in a browser;
the curl session below is the same APIs the page calls.

## What this proves (cadence stage 5)

- **Pain ⑥ (not non-engineer-usable) fixed:** one page shows what Beacon can read + live health, lets
  you trigger a run, and shows the output + run history — no code, no n8n editor.
- **Real, non-mocked runs through the platform:** an onchain run stored 2 real OP Mainnet blocks; a
  GitHub run stored 47 real commits — both written to shared memory and visible in run history.
- **Failures are summaries, not crashes** (`executeRun` unit-tested in `test/control-plane/run.test.ts`).

## Captured session

```
GET /            → HTTP 200

GET /api/connectors
{"backend":"in-memory","connectors":[
  {"name":"github","capabilities":["read:commits"],"health":{"ok":true,"detail":"rate-limit remaining 59"}},
  {"name":"onchain","capabilities":["read:blocks"],"health":{"ok":true,"detail":"OP Mainnet head 153379501"}}]}

POST /api/run {"connector":"onchain","params":{"blocks":2}}
  → {"connector":"onchain","fetched":2,"stored":2,"deduped":0,"ok":true,"latencyMs":557}

POST /api/run {"connector":"github","params":{"repo":"ethereum-optimism/optimism","days":7}}
  → {"connector":"github","fetched":47,"stored":47,"deduped":0,"ok":true,"latencyMs":655}

GET /api/memory?limit=3
  → [{"source":"github","sourceId":"4af0dbef…","agent":"control-plane",
       "payload":{"kind":"commit","label":"karst: acceptance test for upgrade-gas revert across activation (#21533)", …}}, …]

GET /api/runs
  → [{"connector":"github","stored":47,"ok":true,"latencyMs":655,"at":"2026-06-25T03:23:01Z"},
     {"connector":"onchain","stored":2,"ok":true,"latencyMs":557,"at":"2026-06-25T03:23:00Z"}]
```

(Block height / SHAs differ per run — live reads. The page auto-refreshes after a run.)
