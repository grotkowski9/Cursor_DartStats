-- 1.1.2 / 1.1.6 — Auth sync + RLS per user
-- Unique auth_user_id; replace deny-all with owner policies.

CREATE UNIQUE INDEX IF NOT EXISTS customers_auth_user_id_uidx
  ON public.customers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Drop deny-all policies
DROP POLICY IF EXISTS "deny_all" ON public.customers;
DROP POLICY IF EXISTS "deny_all" ON public.matches;
DROP POLICY IF EXISTS "deny_all" ON public.legs;
DROP POLICY IF EXISTS "deny_all" ON public.visits;
DROP POLICY IF EXISTS "deny_all" ON public.share_links;
DROP POLICY IF EXISTS "deny_all" ON public.ingest_snapshots;
DROP POLICY IF EXISTS "deny_all" ON public.snapshot_access_log;

-- Helper: current user's customer_id
CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.customers
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_customer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_customer_id() TO authenticated;

-- customers
CREATE POLICY "customers_select_own"
  ON public.customers FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "customers_update_own"
  ON public.customers FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "customers_insert_own"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- matches
CREATE POLICY "matches_select_own"
  ON public.matches FOR SELECT TO authenticated
  USING (customer_id = public.current_customer_id());

CREATE POLICY "matches_insert_own"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.current_customer_id());

CREATE POLICY "matches_update_own"
  ON public.matches FOR UPDATE TO authenticated
  USING (customer_id = public.current_customer_id())
  WITH CHECK (customer_id = public.current_customer_id());

CREATE POLICY "matches_delete_own"
  ON public.matches FOR DELETE TO authenticated
  USING (customer_id = public.current_customer_id());

-- legs (via match ownership)
CREATE POLICY "legs_select_own"
  ON public.legs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = legs.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "legs_insert_own"
  ON public.legs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = legs.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "legs_update_own"
  ON public.legs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = legs.match_id
        AND m.customer_id = public.current_customer_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = legs.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "legs_delete_own"
  ON public.legs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = legs.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

-- visits
CREATE POLICY "visits_select_own"
  ON public.visits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legs l
      JOIN public.matches m ON m.match_id = l.match_id
      WHERE l.leg_id = visits.leg_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "visits_insert_own"
  ON public.visits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legs l
      JOIN public.matches m ON m.match_id = l.match_id
      WHERE l.leg_id = visits.leg_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "visits_update_own"
  ON public.visits FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legs l
      JOIN public.matches m ON m.match_id = l.match_id
      WHERE l.leg_id = visits.leg_id
        AND m.customer_id = public.current_customer_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legs l
      JOIN public.matches m ON m.match_id = l.match_id
      WHERE l.leg_id = visits.leg_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "visits_delete_own"
  ON public.visits FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legs l
      JOIN public.matches m ON m.match_id = l.match_id
      WHERE l.leg_id = visits.leg_id
        AND m.customer_id = public.current_customer_id()
    )
  );

-- share_links
CREATE POLICY "share_links_select_own"
  ON public.share_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = share_links.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "share_links_insert_own"
  ON public.share_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = share_links.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "share_links_update_own"
  ON public.share_links FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = share_links.match_id
        AND m.customer_id = public.current_customer_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = share_links.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

CREATE POLICY "share_links_delete_own"
  ON public.share_links FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = share_links.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

-- ingest_snapshots
CREATE POLICY "ingest_snapshots_select_own"
  ON public.ingest_snapshots FOR SELECT TO authenticated
  USING (customer_id = public.current_customer_id());

CREATE POLICY "ingest_snapshots_insert_own"
  ON public.ingest_snapshots FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.current_customer_id());

-- snapshot_access_log — owners can read their match access logs
CREATE POLICY "snapshot_access_log_select_own"
  ON public.snapshot_access_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.match_id = snapshot_access_log.match_id
        AND m.customer_id = public.current_customer_id()
    )
  );

-- Grants for authenticated (API still uses service_role for ingest; RLS is defense-in-depth)
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT SELECT, INSERT ON public.ingest_snapshots TO authenticated;
GRANT SELECT ON public.snapshot_access_log TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
