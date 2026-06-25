// embeddings.ts — vectors for semantic recall, behind a provider-swappable interface.
//
// The model is a config choice (the JD's Gemini/Claude/OpenAI note). For a fresh clone with zero
// keys we ship a dependency-free LOCAL stand-in so recall *works offline*; a real provider drops in
// when keyed. Honest about what the stand-in is: it's LEXICAL (hashed bag-of-words), so cosine
// reflects token overlap — enough to demo and test the recall *mechanism*, not true semantics.
// Real semantic recall uses a real embeddings provider (see adr/0003 + .env.example).

export interface Embeddings {
  readonly name: string;
  readonly dim: number;
  embed(text: string): Promise<number[]>;
}

export class LocalEmbeddings implements Embeddings {
  readonly name = "local-lexical";
  constructor(readonly dim = 256) {}

  async embed(text: string): Promise<number[]> {
    const v = new Array<number>(this.dim).fill(0);
    for (const tok of tokenize(text)) v[hash(tok) % this.dim] += 1;
    return l2normalize(v);
  }
}

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

// FNV-1a — small, deterministic, no deps.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function l2normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Cosine similarity. Both inputs are L2-normalized, so the dot product IS the cosine. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}
