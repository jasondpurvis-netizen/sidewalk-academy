-- 002_multi_restaurant.sql
-- One person, more than one restaurant.
--
-- NOT APPLIED. Read it, then paste it into Supabase -> SQL Editor -> Run.
-- It is additive: nothing is dropped, nothing is renamed, and every existing
-- person keeps working exactly as they do today.
--
-- WHY THIS IS NEEDED
-- Today a person is tied to one restaurant by profiles.tenant_id, so an owner
-- with two locations needs two logins and cannot see both. A scheduler who
-- covers both has the same problem.
--
-- WHAT IT ADDS
--   memberships   who belongs to which restaurant, and as what
--   profiles.active_tenant_id  which one they are currently looking at
--
-- Linking two restaurants stays a choice: a person only sees a second one if
-- somebody adds them to it.

BEGIN;

-- 1. Who belongs where. A person can appear once per restaurant.
CREATE TABLE IF NOT EXISTS public.memberships (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'team',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- 2. Everyone who exists today keeps the restaurant they already have.
INSERT INTO public.memberships (user_id, tenant_id, role)
SELECT p.id, p.tenant_id, COALESCE(p.role,'team')
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 3. Which restaurant a person is looking at right now. Defaults to the one
--    they already had, so nobody notices a change until they are in two.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.profiles SET active_tenant_id = tenant_id WHERE active_tenant_id IS NULL;

-- 4. current_tenant_id() answers with the restaurant they are looking at,
--    and only if they really belong to it. Falls back to the old column so
--    this is safe to run before the app knows about any of it.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.active_tenant_id
       FROM public.profiles p
      WHERE p.id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.memberships m
                     WHERE m.user_id = p.id AND m.tenant_id = p.active_tenant_id)),
    (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );
$$;

-- 5. A person may read their own memberships and nothing else. This is what
--    the restaurant switcher reads to know which ones to offer.
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own memberships" ON public.memberships;
CREATE POLICY "own memberships" ON public.memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 6. Switching is the one write a person may make about themselves, and only
--    to a restaurant they are already a member of.
DROP POLICY IF EXISTS "switch own restaurant" ON public.profiles;
CREATE POLICY "switch own restaurant" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (active_tenant_id IS NULL OR EXISTS (
      SELECT 1 FROM public.memberships m
       WHERE m.user_id = auth.uid() AND m.tenant_id = active_tenant_id))
  );

COMMIT;

-- TO UNDO, if anything misbehaves:
--   BEGIN;
--   CREATE OR REPLACE FUNCTION public.current_tenant_id()
--   RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
--   AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid() $$;
--   COMMIT;
-- The table and column can stay; unused, they do nothing.
