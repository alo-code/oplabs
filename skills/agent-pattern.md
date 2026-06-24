# Skill: adding an agent (workflow)

An agent is a workflow that reads from connectors + shared memory, calls a
model with tools, and produces an output (a brief, an answer, a logged
decision). Agents solve "no shared memory across agents" and "hard to hand to
a non-engineer."

## Rules

1. **Tools are connectors, typed.** An agent never calls a data source
   directly; it calls connector tools with `zod`-validated args. The model
   only ever sees the tool surface.
2. **Read and write shared memory.** Pull prior context from memory before
   calling the model; write durable outputs and key facts back. Two agents
   that both touch "the Acme deal" should see the same memory.
3. **Ground every claim.** An agent's output must trace to a source: a commit
   SHA, a PR number, a message link. Ungrounded text is a hallucination
   waiting to reach a stakeholder. Make grounding an eval assertion (stage 2).
4. **Provider behind an interface.** Calls go through `src/core` model
   interface, not a vendor SDK inline — the JD names both Gemini and Claude;
   keep it swappable.
5. **Budget + observe every run.** Emit `agent_runs_total`,
   `agent_tokens_total` (and cost), `agent_latency_ms`, and an `eval_score`.
   Enforce a per-run token ceiling. A workflow that can't be costed can't be
   trusted in production.
6. **Deterministic skeleton, model in the seams.** Control flow (which sources,
   in what order, retries) is plain TypeScript you can test; the model does the
   summarization/judgment. Don't let the model drive control flow you could
   have written deterministically.

## Shape

```ts
export const execBrief = defineAgent({
  name: "exec-brief",
  schedule: "0 13 * * MON",            // always-on, not a laptop
  tools: [github.tool, notion.tool],   // typed connector tools
  async run(ctx) {
    const activity = await ctx.tools.github(/* args */);   // real data
    const prior = await ctx.memory.recall("exec-brief");   // shared memory
    const brief = await ctx.model.summarize({ activity, prior, rubric });
    await ctx.memory.store("exec-brief", brief);           // write-through
    return brief;                                          // + telemetry auto-emitted
  },
});
```

## Definition of done (an agent slice)
- contract: the agent's input (tools/schedule) + output shape;
- red: an **eval** that fails — empty brief, missing grounding, wrong window;
- observability: runs/tokens/cost/latency/eval-score, live;
- green: the run logic, minimal;
- evidence: a real run on real data, the rendered output, and the telemetry
  snapshot in `evidence/<workplan>/<slice>/README.md`.
