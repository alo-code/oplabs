// policy.ts — write-time governance for shared memory (workplan M3.3, the Security/Legal seam).
//
// A decorator over ANY MemoryStore that REDACTS PII before anything is stored (emails, phone numbers,
// secrets) and optionally enforces a TTL on recall. Conservative by default: redact, don't leak. The
// production form adds per-source policy + metadata-vs-body rules; this is the smallest thing that
// keeps a customer's email out of the store — and it's visible in the activity feed.

import type { MemoryItem, MemoryStore, RecallQuery, ScoredItem } from "./store";

const PII: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g, "[redacted-email]"],
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[redacted-secret]"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "[redacted-secret]"],
  [/\bgh[posru]_[A-Za-z0-9]{20,}\b/g, "[redacted-secret]"],
  [/\+\d[\d().\- ]{7,}\d/g, "[redacted-phone]"], // require a + prefix → won't touch onchain block numbers
];

export function redactText(text: string): { text: string; changed: boolean } {
  let out = text;
  for (const [re, rep] of PII) out = out.replace(re, rep);
  return { text: out, changed: out !== text };
}

/** Redact PII in an artifact-shaped payload's label/text, flagging the item when anything changed. */
export function redactPayload(payload: unknown): { payload: unknown; redacted: boolean } {
  if (!payload || typeof payload !== "object") return { payload, redacted: false };
  const p = { ...(payload as Record<string, unknown>) };
  let redacted = false;
  for (const field of ["label", "text"]) {
    const v = p[field];
    if (typeof v === "string") {
      const r = redactText(v);
      if (r.changed) {
        p[field] = r.text;
        redacted = true;
      }
    }
  }
  if (redacted) p.redacted = true;
  return { payload: p, redacted };
}

export class PolicyStore implements MemoryStore {
  constructor(
    private readonly inner: MemoryStore,
    private readonly opts: { ttlMs?: number } = {},
  ) {}

  async store(item: MemoryItem): Promise<{ stored: boolean }> {
    const { payload } = redactPayload(item.payload);
    return this.inner.store({ ...item, payload });
  }
  async recall(query?: RecallQuery): Promise<MemoryItem[]> {
    return this.fresh(await this.inner.recall(query));
  }
  async seen(source: string, sourceId: string): Promise<boolean> {
    return this.inner.seen(source, sourceId);
  }
  async semanticRecall(text: string, k?: number, filter?: { key?: string }): Promise<ScoredItem[]> {
    return this.fresh(await this.inner.semanticRecall(text, k, filter));
  }
  healthcheck(): Promise<{ ok: boolean; detail?: string }> {
    return this.inner.healthcheck();
  }
  close(): Promise<void> {
    return this.inner.close();
  }

  /** Drop items past their TTL on read (off unless ttlMs is set). */
  private fresh<T extends MemoryItem>(items: T[]): T[] {
    if (!this.opts.ttlMs) return items;
    const cutoff = Date.now() - this.opts.ttlMs;
    return items.filter((i) => !i.createdAt || new Date(i.createdAt).getTime() >= cutoff);
  }
}
