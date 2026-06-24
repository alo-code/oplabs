# Skill: AI-driven development

How we use AI to build Beacon. The goal is leverage **with** control — not
"the model wrote it, ship it."

## Principles

1. **The human owns the contract; the AI fills the body.** Decide the shape
   (types, tool schemas, interfaces) yourself or in review *before* generation.
   A wrong contract generated fast is just a faster wrong answer.
2. **Small slices, tight loops.** Ask the AI for one slice at a time
   (`CADENCE.md`). A 400-line green diff from a model is unreviewable and is
   where bugs hide. Keep green small on purpose.
3. **Red before green, always.** Have the AI write the failing test/eval first
   and show it failing. This pins intent and stops "looks plausible" passing
   for "correct."
4. **Verify on real data, not on the model's say-so.** "It should work" is not
   evidence. Run it against real GitHub/Slack/onchain data and capture the
   output (`evidence/`). LLMs are confidently wrong; the drill isn't.
5. **Make the log visible.** Prompts, decisions, dead ends, and corrections go
   in `notes.md`, raw. See `working-with-notes.md`.

## A good loop (one slice)

```
1. State the contract to the AI in 1–3 sentences. Get it to restate it back.
2. Ask for the failing test only. Run it. Confirm it's red for the RIGHT reason.
3. Ask for the observability (metric/log/span/eval). Land it.
4. Ask for the minimal green. Review the diff line by line. Reject scope creep.
5. Run it for real. Capture evidence. Commit with the five-stage audit trail.
```

## Prompting patterns that work here

- **Give it the seams.** Paste `src/connectors/base.ts` or the target
  interface so generated code conforms instead of inventing its own shape.
- **Constrain, then expand.** "Only touch these files. No refactors." prevents
  drive-by edits that blow up the diff.
- **Ask for the test it would fear.** "What input breaks this?" surfaces the
  edge case to pin in red.
- **Make it cite the evidence.** "Show me the command and its real output"
  forces the loop to close on reality.

## Anti-patterns (caught here before)

- Accepting a big green diff because it typechecks. Typechecks ≠ correct.
- Letting the model add a dependency to dodge a 20-line function. Review every
  new dep — it's attack surface and a non-engineer maintenance cost.
- "I'll add metrics later." Later never comes; the failure goes silent. Stage 3
  exists precisely to stop this.
- Cleaning up `notes.md`. The mess is the signal of how the work actually went.
