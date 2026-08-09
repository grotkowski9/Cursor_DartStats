-- App-wide settings (server/admin only). Toggle login gate without redeploy.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → only service_role (bypasses RLS) can read/write.

INSERT INTO public.app_settings (key, value)
VALUES ('login_gate_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.app_settings IS
  'Key/value site settings. login_gate_enabled=true|false gates /login behind LOGIN_GATE_PASSWORD.';
