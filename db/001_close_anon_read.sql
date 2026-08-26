-- 001_close_anon_read.sql
-- Fixes: four tables are readable by anyone on the internet, with no login.
--
-- Why this happens: each of these tables has a RESTRICTIVE "tenant_isolation"
-- policy, but restrictive policies only constrain the roles they are granted
-- to -- and these are granted to `authenticated` only. The permissive read
-- policy, however, is granted to {anon, authenticated} with USING (true).
-- So a logged-out visitor matches the permissive rule and is constrained by
-- nothing. Logged-in users are correctly isolated already.
--
-- The fix is to drop `anon` from the read policies. Nothing else changes.
--
-- Verified safe: boot() calls loadSettings() only AFTER a session exists.
-- The logged-out screen renders from the hardcoded DEFAULT_NAME /
-- DEFAULT_BRAND / DEFAULT_LOGO constants, never from the settings table.
-- The ?join=CODE signup flow only prefills a text field; the actual join
-- runs through the join_restaurant RPC after authentication.

BEGIN;

DROP POLICY IF EXISTS "settings read" ON public.settings;
CREATE POLICY "settings read" ON public.settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "res read" ON public.resources;
CREATE POLICY "res read" ON public.resources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "gl read" ON public.glossary;
CREATE POLICY "gl read" ON public.glossary
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cm read" ON public.channel_modes;
CREATE POLICY "cm read" ON public.channel_modes
  FOR SELECT TO authenticated USING (true);

COMMIT;

-- Rollback, if the app misbehaves: re-run the four CREATE POLICY statements
-- above with `TO anon, authenticated` instead of `TO authenticated`.
