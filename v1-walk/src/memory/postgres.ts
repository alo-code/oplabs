// postgres.ts — the real shared substrate: Postgres + pgvector, behind the SAME MemoryStore.
//
// This is what makes memory durable, queryable, and shared across processes/hosts — so two agents
// on two machines see each other's context. Schema lives in migrations/0001_memory.sql (applied by
// docker-compose on first boot). Dedup is an ON CONFLICT on (source, source_id). Semantic recall
// uses the ivfflat cosine index. Bring it up with `npm run db:up`, point DATABASE_URL at it.

import { performance } from "node:perf_hooks";
import pg from "pg";
import { LocalEmbeddings, type Embeddings } from "./embeddings";
import { metrics } from "../observability/telemetry";
import {
  countStore,
  embedText,
  type MemoryItem,
  type MemoryStore,
  type Principal,
  type RecallQuery,
  type ScoredItem,
} from "./store";

interface Row {
  key: string;
  source: string;
  source_id: string;
  agent: string | null;
  payload: unknown;
  created_at: Date;
  source_acl: string[] | null;
  score?: string;
}

// The read-side authorization predicate, applied BEFORE rows are returned (and, in production, also
// enforced by the row-level-security policy in migrations/0002_source_acl.sql when the app connects
// as a non-owner role). Unrestricted rows are visible to all; otherwise the row's ACL must name the
// caller or one of its groups. Pushes two params (groups text[], id text) and returns the SQL.
function aclPredicate(principal: Principal, params: unknown[]): string {
  params.push(principal.groups);
  const groups = `$${params.length}::text[]`;
  params.push(principal.id);
  const id = `$${params.length}`;
  // unrestricted = SQL null OR jsonb null OR empty array; else the ACL must name the caller or a group.
  return `(source_acl IS NULL OR source_acl IN ('null'::jsonb, '[]'::jsonb) OR source_acl ?| ${groups} OR source_acl ? ${id})`;
}

export class PostgresStore implements MemoryStore {
  private readonly pool: pg.Pool;
  private readonly embeddings: Embeddings;

  constructor(opts: { connectionString: string; embeddings?: Embeddings }) {
    this.pool = new pg.Pool({ connectionString: opts.connectionString });
    this.embeddings = opts.embeddings ?? new LocalEmbeddings();
  }

  async store(item: MemoryItem): Promise<{ stored: boolean }> {
    const embedding = toVector(await this.embeddings.embed(embedText(item)));
    const res = await this.pool.query(
      `INSERT INTO memory_items (key, source, source_id, agent, payload, embedding, source_acl)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector, $7::jsonb)
       ON CONFLICT (source, source_id) DO NOTHING`,
      [
        item.key,
        item.source,
        item.sourceId,
        item.agent ?? null,
        JSON.stringify(item.payload),
        embedding,
        item.acl ? JSON.stringify(item.acl) : null,
      ],
    );
    const stored = (res.rowCount ?? 0) > 0;
    countStore(stored);
    return { stored };
  }

  async recall(query: RecallQuery = {}): Promise<MemoryItem[]> {
    const start = performance.now();
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.key) (params.push(query.key), where.push(`key = $${params.length}`));
    if (query.source) (params.push(query.source), where.push(`source = $${params.length}`));
    if (query.agent) (params.push(query.agent), where.push(`agent = $${params.length}`));
    if (query.principal) where.push(aclPredicate(query.principal, params));
    params.push(query.limit ?? 50);
    const sql =
      `SELECT key, source, source_id, agent, payload, created_at, source_acl FROM memory_items ` +
      `${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT $${params.length}`;
    const res = await this.pool.query<Row>(sql, params);
    metrics.observe("memory_recall_latency_ms", performance.now() - start, { mode: "structured" });
    return res.rows.map(rowToItem);
  }

  async seen(source: string, sourceId: string): Promise<boolean> {
    const res = await this.pool.query(`SELECT 1 FROM memory_items WHERE source = $1 AND source_id = $2 LIMIT 1`, [
      source,
      sourceId,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  async semanticRecall(text: string, k = 5, filter?: { key?: string; principal?: Principal }): Promise<ScoredItem[]> {
    const start = performance.now();
    const q = toVector(await this.embeddings.embed(text));
    const params: unknown[] = [q];
    const conds: string[] = [];
    if (filter?.key) (params.push(filter.key), conds.push(`key = $${params.length}`));
    if (filter?.principal) conds.push(aclPredicate(filter.principal, params)); // scope BEFORE the ANN search
    const filterSql = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    params.push(k);
    const sql =
      `SELECT key, source, source_id, agent, payload, created_at, source_acl, 1 - (embedding <=> $1::vector) AS score ` +
      `FROM memory_items ${filterSql} ORDER BY embedding <=> $1::vector LIMIT $${params.length}`;
    const res = await this.pool.query<Row>(sql, params);
    metrics.observe("semantic_recall_latency_ms", performance.now() - start, { mode: "semantic" });
    return res.rows.map((r) => ({ ...rowToItem(r), score: Number(r.score) }));
  }

  async healthcheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await this.pool.query<{ n: number }>("SELECT count(*)::int AS n FROM memory_items");
      return { ok: true, detail: `${res.rows[0]!.n} items (postgres)` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function toVector(v: number[]): string {
  return `[${v.join(",")}]`; // pgvector text format
}

function rowToItem(r: Row): MemoryItem {
  return {
    key: r.key,
    source: r.source,
    sourceId: r.source_id,
    agent: r.agent ?? undefined,
    payload: r.payload,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    acl: Array.isArray(r.source_acl) ? r.source_acl : undefined,
  };
}
