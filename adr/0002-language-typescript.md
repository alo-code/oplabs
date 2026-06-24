# ADR 0002 — Language: TypeScript for the prototype

**Status:** accepted · **Date:** 2026-06-24

## Context
The JD lists Python and Go. The case study grades judgment + AI orchestration and says *"it has to
run."* I'm strongest in TypeScript.

## Decision
Build the prototype's real code (the trust core, the demos, the onchain read) in **TypeScript**.
Keep the production vision **polyglot** behind language-agnostic seams.

## Why
- "It has to run" → my strongest language gives the cleanest runnable slice in the time.
- The agent/MCP/onchain tooling (Vercel AI SDK, MCP TS SDK, `viem`) is first-class in TS — the
  onchain read here uses `viem` directly.
- End-to-end type safety removes a bug class — which matters when handing to a non-engineer.

## Consequences
- (+) A clean, tested slice; one language across trust core, demo, and onchain.
- (−) Not the JD's stack. Mitigated: production stays polyglot (Python for eval/ML agents, a Go hot
  path) behind tool schemas / a bus / HTTP — additive, no rewrite.
- This is itself the "tradeoff judgment" the case study tests; owning it beats hiding it.
