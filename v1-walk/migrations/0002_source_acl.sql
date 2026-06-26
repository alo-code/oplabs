-- 0002_source_acl.sql — read-side access control: mirror each source's ACL onto the memory row.
-- The v2 design (../../v2-run/docs/access-control.md) made real at the schema seam, so v3's MCP has a
-- boundary to lean on instead of a flat table. Idempotent; safe to re-run. Applied by docker-compose
-- on first boot (after 0001) or by hand: psql "$DATABASE_URL" -f migrations/0002_source_acl.sql
--
-- v0/v1 behavior is UNCHANGED: nothing populates these columns yet and recall passes no principal, so
-- every row stays unrestricted (exec/admin sees everything). v2 turns it on by (a) writing source_acl
-- at ingestion from each connector's fetchAcl and (b) passing the caller's principal into recall.

-- The access axis (who may read) + handling/provenance fields the v2 doc names. JSONB array of
-- principal/group ids; NULL = unrestricted.
ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS source_acl     JSONB,        -- principals/groups who may read the source
  ADD COLUMN IF NOT EXISTS acl_synced_at  TIMESTAMPTZ,  -- when source_acl was last refreshed (staleness clock)
  ADD COLUMN IF NOT EXISTS classification TEXT,         -- handling axis: public|internal|confidential|restricted
  ADD COLUMN IF NOT EXISTS label_rule     TEXT;         -- provenance: which rule produced the ACL (auditable)

-- GIN index so the ?| / ? containment checks in the recall predicate stay fast at scale.
CREATE INDEX IF NOT EXISTS memory_items_acl_idx ON memory_items USING gin (source_acl);

-- ── Production enforcement: row-level security ────────────────────────────────────────────────────
-- Defense-in-depth. The app already filters in SQL (src/memory/postgres.ts), but RLS makes the
-- DATABASE the enforcement point, so a query that forgets the predicate still can't leak a row.
-- Policy: unrestricted rows are visible; with no principal set we're in exec/admin mode (v1 default,
-- see all); otherwise the row's ACL must name the caller or one of its groups (default-deny).
--
-- NOTE on the demo: this box connects as the bootstrap SUPERUSER (beacon), and superusers BYPASS RLS
-- entirely — so the policy below is inert here and the postgres.ts predicate is what actually scopes.
-- In production the app connects as a NON-OWNER role (e.g. beacon_app) for which RLS engages; the
-- store sets the per-transaction GUCs `beacon.principal_id` / `beacon.principal_groups` before SELECT.
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memory_items_acl ON memory_items;
CREATE POLICY memory_items_acl ON memory_items
  FOR SELECT
  USING (
    source_acl IS NULL OR source_acl IN ('null'::jsonb, '[]'::jsonb)                 -- unrestricted row
    OR current_setting('beacon.principal_id', true) IS NULL                         -- exec/admin mode (no caller)
    OR source_acl ? current_setting('beacon.principal_id', true)                    -- caller named directly
    OR source_acl ?| string_to_array(                                              -- caller in one of its groups
         coalesce(nullif(current_setting('beacon.principal_groups', true), ''), '\x00'), ',')
  );
