-- Drop generated display_name — UI skleja first_name / nickname / last_name w TS
-- (formatCustomerDisplayName). Źródło prawdy = osobne kolumny.

ALTER TABLE public.customers DROP COLUMN IF EXISTS display_name;
