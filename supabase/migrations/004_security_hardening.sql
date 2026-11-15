-- ============================================================
-- D4TF Connect – Security hardening
-- Run this in your Supabase SQL Editor AFTER deploying the matching app code
-- (API routes now perform these writes with the service-role key).
--
-- Closes three gaps:
--   1. Manufacturers could insert offers directly (skipping the £3 payment).
--   2. Users could insert/update their own payment records (e.g. mark "paid").
--   3. Users could set their own verification flags / tier / role on profiles.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. OFFERS – only trusted server code creates offers (after Stripe confirms payment)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "offers_insert_manufacturer" ON public.offers;
-- No INSERT/UPDATE/DELETE policies remain for regular users.
-- SELECT policies (own offers / offers on own requests) are unchanged.


-- ─────────────────────────────────────────────
-- 2. PAYMENTS – read-only for users; all writes go through API routes
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "payments_insert_own" ON public.actions_payments;
DROP POLICY IF EXISTS "payments_update_own" ON public.actions_payments;
-- "payments_select_own" is unchanged.


-- ─────────────────────────────────────────────
-- 3. PROFILES – lock identity & trust columns
-- ─────────────────────────────────────────────
-- Profiles are created by the on_auth_user_created trigger (SECURITY DEFINER),
-- so users never need to insert their own row.
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Users may still update name / bio / city / country / profile_image_url.
-- Anything that affects trust or permissions can only be changed by
-- server code (service_role) or SECURITY DEFINER functions such as
-- refresh_verification_tier().
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- current_user is 'authenticated' / 'anon' for requests made with a user JWT
  -- or the anon key; it is 'service_role' for the server, and the function
  -- owner inside SECURITY DEFINER functions.
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.role                     IS DISTINCT FROM OLD.role
    OR NEW.verified                 IS DISTINCT FROM OLD.verified
    OR NEW.verification_tier        IS DISTINCT FROM OLD.verification_tier
    OR NEW.phone                    IS DISTINCT FROM OLD.phone
    OR NEW.phone_verified           IS DISTINCT FROM OLD.phone_verified
    OR NEW.companies_house_number   IS DISTINCT FROM OLD.companies_house_number
    OR NEW.companies_house_name     IS DISTINCT FROM OLD.companies_house_name
    OR NEW.companies_house_verified IS DISTINCT FROM OLD.companies_house_verified
    THEN
      RAISE EXCEPTION 'These profile fields can only be changed by the verification process'
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns ON public.profiles;
CREATE TRIGGER protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_columns();


-- ─────────────────────────────────────────────
-- 4. BUG FIX – calculate_verification_tier: "column reference profile_id is ambiguous"
-- ─────────────────────────────────────────────
-- The parameter `profile_id` has the same name as the portfolio_items /
-- profile_links column, so the COUNT(*) queries raised an error. Because the
-- refresh triggers call this function, adding a portfolio image or contact link
-- failed, and tiers were never recalculated. Qualifying the columns fixes it
-- (the parameter name is kept so existing rpc({ profile_id }) calls still work).
CREATE OR REPLACE FUNCTION public.calculate_verification_tier(profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p               public.profiles%ROWTYPE;
  portfolio_count integer;
  links_count     integer;
  tier            text := 'unverified';
BEGIN
  SELECT * INTO p FROM public.profiles WHERE public.profiles.id = calculate_verification_tier.profile_id;
  IF NOT FOUND THEN RETURN 'unverified'; END IF;

  SELECT COUNT(*) INTO portfolio_count
    FROM public.portfolio_items pi WHERE pi.profile_id = p.id;

  SELECT COUNT(*) INTO links_count
    FROM public.profile_links pl WHERE pl.profile_id = p.id;

  -- BASIC: phone verified
  IF p.phone_verified THEN
    tier := 'basic';

    -- VERIFIED: basic + complete profile
    -- Manufacturers need at least 5 portfolio images
    -- Brands only need bio, city, and a contact link
    IF (
      p.bio IS NOT NULL AND length(trim(p.bio)) >= 40
      AND p.city IS NOT NULL AND trim(p.city) <> ''
      AND links_count >= 1
      AND (p.role = 'brand' OR portfolio_count >= 5)
    ) THEN
      tier := 'verified';

      -- TRUSTED: verified + Companies House confirmed
      IF p.companies_house_verified THEN
        tier := 'trusted';
      END IF;
    END IF;
  END IF;

  RETURN tier;
END;
$$;
