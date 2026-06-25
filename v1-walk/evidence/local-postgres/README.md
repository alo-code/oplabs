# Evidence — run all locally: v1 on Postgres+pgvector

**Captured:** 2026-06-25 · **Command:** `./beacon up` (from the repo root)
**Environment:** local Docker (colima); Postgres+pgvector via `docker-compose`; control plane on it.

## What this proves (cadence stage 5)

- **`./beacon up` brings the whole v1 stack up locally** — Postgres+pgvector (migration applied on
  first boot) + the control plane *on* it. `status` reports `"backend":"postgres+pgvector"`.
- **The previously-skipped Postgres contract suite now runs and passes** — `test/memory/contract.test.ts`
  goes 6 → **10 tests**; full suite **34 passed / 0 skipped** with `DATABASE_URL` set. The Postgres
  impl (jsonb/vector casts, dedup `ON CONFLICT`, pgvector cosine recall) is exercised for real.
- **Durable, cross-process shared memory:** the control-plane *process* wrote real runs that persist
  in Postgres — visible by querying the DB directly, not the app.

## Captured output

```
$ ./beacon up
→ Postgres + pgvector: docker compose up (waiting for healthy)…
 Container v1-walk-db-1  Healthy
→ starting control plane on http://localhost:7878 …
✓ up (pid 68620) → open http://localhost:7878
  memory: postgres+pgvector

$ ./beacon status
✓ running → http://localhost:7878
{"backend":"postgres+pgvector","connectors":[{"name":"github", … "ok":true …},
                                              {"name":"onchain", … "OP Mainnet head 153381583"}]}

# two real runs triggered from the page API (github, onchain) → then query Postgres directly:
$ docker exec v1-walk-db-1 psql -U beacon -d beacon -c \
    "select source, count(*) from memory_items group by source order by 2 desc;"
  source  | count
----------+-------
 github   |    47
 optimism |     3

$ … "select left(payload->>'label',60) from memory_items where source='github' limit 3;"
 docs(SDM): Add Sequencer Defined Metering (SDM) chain-operat
 feat: add FeeVault withdrawal route setter (#20982)
 feat(kona): add kona-sp1 range-executor + SP1 execute action
```

## Run it yourself

```bash
# needs Docker running (Docker Desktop, or: colima start)
./beacon up      # Postgres+pgvector + control plane on it → http://localhost:7878
./beacon status  # backend: postgres+pgvector
./beacon down    # stops the control plane AND Postgres
```
`./beacon up` is idempotent and restarts only the server onto the running DB — it does **not** bounce
Postgres, so data survives a server restart.
