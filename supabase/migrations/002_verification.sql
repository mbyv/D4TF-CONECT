-- ============================================================
-- D4TF Connect – Verification System
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone                    text,
  ADD COLUMN IF NOT EXISTS phone_verified           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS companies_house_number   text,
  ADD COLUMN IF NOT EXISTS companies_house_name     text,
  ADD COLUMN IF NOT EXISTS companies_house_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_tier        text NOT NULL DEFAULT 'unverified'
    CHECK (verification_tier IN ('unverified', 'basic', 'verified', 'trusted'));

-- ─────────────────────────────────────────────
-- Function: auto-calculate verification tier
-- Called whenever profile data changes
-- ─────────────────────────────────────────────
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
  SELECT * INTO p FROM public.profiles WHERE id = profile_id;
  IF NOT FOUND THEN RETURN 'unverified'; END IF;

  SELECT COUNT(*) INTO portfolio_count
    FROM public.portfolio_items WHERE profile_id = p.id;

  SELECT COUNT(*) INTO links_count
    FROM public.profile_links WHERE profile_id = p.id;

  -- BASIC: phone verified
  IF p.phone_verified THEN
    tier := 'basic';

    -- VERIFIED: basic + complete profile
    IF (
      p.bio IS NOT NULL AND length(trim(p.bio)) >= 40
      AND p.city IS NOT NULL AND trim(p.city) <> ''
      AND links_count >= 1
      AND (p.role = 'brand' OR portfolio_count >= 1)
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

-- ─────────────────────────────────────────────
-- Function: apply tier to profile
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_verification_tier(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tier text;
BEGIN
  new_tier := public.calculate_verification_tier(profile_id);
  UPDATE public.profiles
    SET
      verification_tier = new_tier,
      verified          = (new_tier IN ('verified', 'trusted'))
    WHERE id = profile_id;
END;
$$;

-- ─────────────────────────────────────────────
-- Trigger: refresh tier when portfolio or links change
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_refresh_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.profile_id, OLD.profile_id);
  PERFORM public.refresh_verification_tier(pid);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_tier_on_portfolio ON public.portfolio_items;
CREATE TRIGGER refresh_tier_on_portfolio
  AFTER INSERT OR DELETE ON public.portfolio_items
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_refresh_tier();

DROP TRIGGER IF EXISTS refresh_tier_on_links ON public.profile_links;
CREATE TRIGGER refresh_tier_on_links
  AFTER INSERT OR DELETE ON public.profile_links
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_refresh_tier();

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(verification_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified);
