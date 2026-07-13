-- Osobny klient demo (Antoni „Robot" Kowalski) — mecze trzymane w DB, nie w repo.

INSERT INTO public.customers (customer_id, first_name, last_name, nickname, known_nicknames)
VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'Antoni',
  'Kowalski',
  'Robot',
  ARRAY['Kowalski', 'Robot', 'Antoni', 'KOWALSKI']
)
ON CONFLICT (customer_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  nickname = EXCLUDED.nickname,
  known_nicknames = EXCLUDED.known_nicknames;
