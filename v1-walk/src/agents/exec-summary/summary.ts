// summary.ts — the executive summary, built from shared memory.
//
// This is the case study's headline workflow (the weekly exec brief), now produced on the v1
// platform from MULTI-SOURCE shared memory instead of one laptop script. The structured report is
// GROUNDED BY CONSTRUCTION: every bullet is a real artifact (id + url) pulled from memory, so there's
// nothing to hallucinate. A narrative is added by an LLM only when a key is present — and even then
// the grounded sections are deterministic; the model just writes prose over them.

import type { MemoryItem } from "../../memory/store";

export interface ReportBullet {
  text: string;
  source: string;
  kind: string;
  id: string;
  url: string;
}
export interface ReportSection {
  heading: string;
  bullets: ReportBullet[];
  more: number; // how many additional items beyond those shown
}
export interface Report {
  title: string;
  window: string;
  generatedAt: string; // ISO
  engine: string; // "local" | "claude"
  stats: { sources: number; items: number };
  narrative?: string; // present only when an LLM wrote it
  sections: ReportSection[];
}

const SECTIONS: Array<{ source: string; heading: string }> = [
  { source: "github", heading: "🚢 Shipped — engineering" },
  { source: "slack", heading: "💬 Team & GTM signals" },
  { source: "monday", heading: "💼 Deals & pipeline" },
  { source: "notion", heading: "📝 Docs & decisions" },
  { source: "optimism", heading: "⛓ Onchain" },
];
const PER_SECTION = 6;

function bulletOf(item: MemoryItem): ReportBullet {
  const p = (item.payload ?? {}) as { label?: string; kind?: string; id?: string; url?: string };
  return {
    text: p.label ?? item.sourceId,
    source: item.source,
    kind: p.kind ?? "item",
    id: p.id ?? item.sourceId,
    url: p.url ?? "#",
  };
}

function windowOf(items: MemoryItem[]): string {
  const dates = items.map((i) => i.createdAt).filter(Boolean).sort() as string[];
  if (!dates.length) return "no activity yet";
  const from = dates[0]!.slice(0, 10);
  const to = dates[dates.length - 1]!.slice(0, 10);
  return from === to ? `as of ${to}` : `${from} → ${to}`;
}

/** The deterministic, grounded report — zero keys, no model. Groups memory by source into sections. */
export function localReport(items: MemoryItem[], generatedAt: string): Report {
  const bySource = new Map<string, MemoryItem[]>();
  for (const i of items) (bySource.get(i.source) ?? bySource.set(i.source, []).get(i.source)!).push(i);

  const sections: ReportSection[] = [];
  const used = new Set<string>();
  for (const { source, heading } of SECTIONS) {
    const group = bySource.get(source) ?? [];
    if (!group.length) continue;
    used.add(source);
    sections.push({ heading, bullets: group.slice(0, PER_SECTION).map(bulletOf), more: Math.max(0, group.length - PER_SECTION) });
  }
  // any source we don't have a heading for still shows up — the platform shouldn't hide data
  for (const [source, group] of bySource) {
    if (used.has(source)) continue;
    sections.push({ heading: `📦 ${source}`, bullets: group.slice(0, PER_SECTION).map(bulletOf), more: Math.max(0, group.length - PER_SECTION) });
  }

  return {
    title: "OP Labs — Activity Brief",
    window: windowOf(items),
    generatedAt,
    engine: "local",
    stats: { sources: bySource.size, items: items.length },
    sections,
  };
}

export interface Summarizer {
  readonly name: string;
  summarize(items: MemoryItem[], generatedAt: string): Promise<Report>;
}

/** Zero-key default: the grounded structured report, no narrative. */
export class LocalSummarizer implements Summarizer {
  readonly name = "local";
  async summarize(items: MemoryItem[], generatedAt: string): Promise<Report> {
    return localReport(items, generatedAt);
  }
}

/** When ANTHROPIC_API_KEY is set: the same grounded sections + a Claude-written narrative over them.
 *  The model only gets the real artifacts and is told to cite ids and invent nothing. */
export class ClaudeSummarizer implements Summarizer {
  readonly name = "claude";
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  ) {}

  async summarize(items: MemoryItem[], generatedAt: string): Promise<Report> {
    const base = localReport(items, generatedAt);
    try {
      const narrative = await this.writeNarrative(items);
      return { ...base, engine: "claude", narrative };
    } catch {
      // never fail the report because the model call did — fall back to the grounded structure
      return base;
    }
  }

  private async writeNarrative(items: MemoryItem[]): Promise<string> {
    const lines = items
      .slice(0, 60)
      .map((i) => {
        const p = i.payload as { label?: string; id?: string };
        return `- [${i.source}] ${p?.label ?? i.sourceId} (${p?.id ?? i.sourceId})`;
      })
      .join("\n");
    const prompt =
      "You write OP Labs' weekly internal activity brief for executives. Given these REAL artifacts " +
      "(one per line, each tagged with its source and id), write a tight 4-6 sentence summary grouped " +
      "by theme (what shipped, GTM/deals, docs, onchain). Cite artifacts inline by id in (parens). " +
      "Mention NOTHING that is not in the list — no invented numbers.\n\nArtifacts:\n" +
      lines;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return (data.content ?? []).map((c) => c.text ?? "").join("").trim();
  }
}

/** Provider-swappable, like memory's embeddings: Claude when keyed, the grounded local report otherwise. */
export function pickSummarizer(): Summarizer {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new ClaudeSummarizer(key) : new LocalSummarizer();
}
