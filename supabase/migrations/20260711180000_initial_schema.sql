-- Cursor_DartStats — initial schema (MVP single-user, multi-tenant-ready)

-- customers
CREATE TABLE public.customers (
  customer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users,
  first_name text NOT NULL,
  last_name text NOT NULL,
  nickname text,
  display_name text GENERATED ALWAYS AS (
    CASE
      WHEN nickname IS NOT NULL AND btrim(nickname) <> '' THEN
        first_name || ' „' || nickname || '" ' || last_name
      ELSE
        first_name || ' ' || last_name
    END
  ) STORED,
  known_nicknames text[] NOT NULL DEFAULT '{}',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin', 'superadmin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- matches
CREATE TABLE public.matches (
  match_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  n01_tmid text NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('league', 'tournament')),
  title text NOT NULL,
  opponent_name text,
  start_time timestamptz NOT NULL,
  update_time timestamptz,
  start_score int NOT NULL DEFAULT 501,
  player_index smallint,
  player_legs_won int,
  opponent_legs_won int,
  player_average numeric,
  player_first9 numeric,
  player_checkout_pct numeric,
  players jsonb NOT NULL DEFAULT '[]',
  raw_payload jsonb,
  snapshot_path text NOT NULL,
  html_snapshot_path text,
  share_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, n01_tmid)
);

CREATE INDEX matches_customer_start_idx ON public.matches (customer_id, start_time DESC);

-- legs
CREATE TABLE public.legs (
  leg_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(match_id) ON DELETE CASCADE,
  leg_number int NOT NULL,
  winner_index smallint NOT NULL,
  first_player smallint NOT NULL DEFAULT 0,
  player_darts int,
  opponent_darts int,
  player_average numeric,
  opponent_average numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, leg_number)
);

CREATE INDEX legs_match_idx ON public.legs (match_id, leg_number);

-- visits
CREATE TABLE public.visits (
  visit_id bigserial PRIMARY KEY,
  leg_id uuid NOT NULL REFERENCES public.legs(leg_id) ON DELETE CASCADE,
  player_index smallint NOT NULL,
  visit_number int NOT NULL,
  raw_score int NOT NULL,
  left_after int NOT NULL,
  actual_score int NOT NULL,
  darts_thrown smallint NOT NULL,
  is_checkout boolean NOT NULL DEFAULT false,
  is_bust boolean NOT NULL DEFAULT false,
  is_setup boolean NOT NULL DEFAULT false,
  UNIQUE (leg_id, player_index, visit_number)
);

CREATE INDEX visits_leg_idx ON public.visits (leg_id, player_index, visit_number);

-- share_links
CREATE TABLE public.share_links (
  share_token text PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(match_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX share_links_match_idx ON public.share_links (match_id);

-- ingest_snapshots
CREATE TABLE public.ingest_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(match_id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  n01_tmid text NOT NULL,
  payload_hash text NOT NULL,
  snapshot_path text NOT NULL,
  html_snapshot_path text,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ingest_snapshots_customer_idx ON public.ingest_snapshots (customer_id, ingested_at DESC);

-- snapshot_access_log
CREATE TABLE public.snapshot_access_log (
  log_id bigserial PRIMARY KEY,
  share_token text NOT NULL,
  access_kind text NOT NULL,
  match_id uuid,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text
);

CREATE INDEX snapshot_access_log_share_idx ON public.snapshot_access_log (share_token, accessed_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS deny-by-default
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all" ON public.customers FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all" ON public.matches FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all" ON public.legs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all" ON public.visits FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all" ON public.share_links FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all" ON public.ingest_snapshots FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all" ON public.snapshot_access_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dart-snapshots',
  'dart-snapshots',
  false,
  52428800,
  ARRAY['application/json', 'text/html']
)
ON CONFLICT (id) DO NOTHING;

-- seed MVP customer
INSERT INTO public.customers (customer_id, first_name, last_name, nickname, known_nicknames)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Piotr',
  'Grotkowski',
  'Groteł',
  ARRAY['Grotkowski', 'Groteł', 'Grotel']
)
ON CONFLICT (customer_id) DO NOTHING;
