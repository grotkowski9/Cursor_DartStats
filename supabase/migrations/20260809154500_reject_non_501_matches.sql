-- Stats are 501-only for now. Drop any non-501 matches and lock the column.

DELETE FROM public.ingest_snapshots
WHERE match_id IN (
  SELECT match_id FROM public.matches WHERE start_score <> 501
);

DELETE FROM public.matches WHERE start_score <> 501;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_start_score_501_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_start_score_501_check CHECK (start_score = 501);
