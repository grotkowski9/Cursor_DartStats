-- 1.1.10 optional "O Tobie" fields + 1.1.3.8 tour flag on customers

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS dart_brand text,
  ADD COLUMN IF NOT EXISTS dart_brand_other text,
  ADD COLUMN IF NOT EXISTS dart_model text,
  ADD COLUMN IF NOT EXISTS dart_weight_bucket text,
  ADD COLUMN IF NOT EXISTS throwing_hand text,
  ADD COLUMN IF NOT EXISTS favorite_player_id text,
  ADD COLUMN IF NOT EXISTS profile_stats_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS about_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;

COMMENT ON COLUMN public.customers.city IS '1.1.10.1 whitelist PL city';
COMMENT ON COLUMN public.customers.dart_brand IS '1.1.10.4 brand id or other';
COMMENT ON COLUMN public.customers.dart_weight_bucket IS '1.1.10.6 e.g. 14-, 23, 28+';
COMMENT ON COLUMN public.customers.throwing_hand IS '1.1.10.10 L or R';
COMMENT ON COLUMN public.customers.about_completed_at IS '1.1.10 null = soft CTA';
COMMENT ON COLUMN public.customers.tour_completed_at IS '1.1.3.8 auto tour once';
