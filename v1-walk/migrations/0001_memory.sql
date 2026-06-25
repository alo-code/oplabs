-- 0001_memory.sql — shared memory schema (Postgres + pgvector).
-- Applied automatically by docker-compose on first boot (mounted into /docker-entrypoint-initdb.d).
-- Idempotent so it's safe to re-run.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_items (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT        NOT NULL,
  source      TEXT        NOT NULL,
  source_id   TEXT        NOT NULL,
  agent       TEXT,
  payload     JSONB       NOT NULL,
  embedding   vector(256),                       -- matches LocalEmbeddings(dim=256)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)                     -- dedup by identity, not content
);

CREATE INDEX IF NOT EXISTS memory_items_key_idx ON memory_items (key);

-- Approximate-nearest-neighbour index for semantic recall (cosine distance).
CREATE INDEX IF NOT EXISTS memory_items_embedding_idx
  ON memory_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
