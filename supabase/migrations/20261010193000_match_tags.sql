-- Per-match tags for profile include/exclude filters.
-- Additive. Import overwrite must not wipe tags (column omitted on upsert).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_tags_len;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_tags_len CHECK (cardinality(tags) <= 8);

COMMENT ON COLUMN public.matches.tags IS
  'User labels on a single match. Used to include/exclude matches on the profile stats view.';
