-- ============================================================
-- D4TF Connect – Raise manufacturer portfolio minimum to 5
-- Run this in your Supabase SQL Editor
-- ============================================================

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
