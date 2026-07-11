-- Split customer display into first_name, last_name, nickname.
-- display_name is generated for UI (Imię „pseudonim" Nazwisko).

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS nickname text;

UPDATE public.customers
SET
  first_name = 'Piotr',
  last_name = 'Grotkowski',
  nickname = 'Groteł',
  known_nicknames = ARRAY['Grotkowski', 'Groteł', 'Grotel']
WHERE customer_id = 'a0000000-0000-4000-8000-000000000001'
  AND first_name IS NULL;

UPDATE public.customers
SET
  first_name = split_part(display_name, ' ', 1),
  last_name = split_part(display_name, ' ', greatest(array_length(string_to_array(display_name, ' '), 1), 1))
WHERE first_name IS NULL
  AND display_name IS NOT NULL;

ALTER TABLE public.customers
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

ALTER TABLE public.customers DROP COLUMN IF EXISTS display_name;

ALTER TABLE public.customers
  ADD COLUMN display_name text GENERATED ALWAYS AS (
    CASE
      WHEN nickname IS NOT NULL AND btrim(nickname) <> '' THEN
        first_name || ' „' || nickname || '" ' || last_name
      ELSE
        first_name || ' ' || last_name
    END
  ) STORED;
