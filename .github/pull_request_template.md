## What & why
<!-- one line -->

## Cadence (see CADENCE.md)
- [ ] Contract agreed (type / node / route / env)
- [ ] Failing test or eval written first
- [ ] Observability added (metric / log / eval signal)
- [ ] Green: the smallest diff that passes
- [ ] Evidence on real data under `evidence/`

## Checks
- [ ] `npm test` + `npm run typecheck` green (in the version dir you touched)
- [ ] `notes.md` updated (append-only)
- [ ] Trust gate re-synced if `src/trust/` changed (see `skills/n8n-workflow.md`)
