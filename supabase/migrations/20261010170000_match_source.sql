-- Additive source tag for N01 vs Polski Ranking Darta.
-- n01_tmid stays the external id (N01 tmid, or prd:<uuid>).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'n01';

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_source_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_source_check CHECK (source = ANY (ARRAY['n01'::text, 'prd'::text]));

COMMENT ON COLUMN public.matches.source IS 'Origin of the match payload: n01 or prd (Polski Ranking Darta).';

ALTER TABLE public.ingest_snapshots
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'n01';

ALTER TABLE public.ingest_snapshots
  DROP CONSTRAINT IF EXISTS ingest_snapshots_source_check;

ALTER TABLE public.ingest_snapshots
  ADD CONSTRAINT ingest_snapshots_source_check CHECK (source = ANY (ARRAY['n01'::text, 'prd'::text]));
