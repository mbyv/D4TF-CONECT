-- ============================================================
-- D4TF Connect – Initial Schema
-- Run this in your Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role              text        NOT NULL CHECK (role IN ('brand', 'manufacturer')),
  name              text        NOT NULL,
  bio               text,
  city              text,
  country           text,
  profile_image_url text,
  verified          boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read all profiles (for directories and profile pages)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only insert their own profile row
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can only update their own profile row
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ─────────────────────────────────────────────
-- 2. PRODUCTION REQUESTS
-- ─────────────────────────────────────────────
CREATE TABLE public.production_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text        NOT NULL,
  quantity    integer     NOT NULL CHECK (quantity > 0),
  budget      numeric     NOT NULL CHECK (budget >= 0),
  deadline    date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_requests ENABLE ROW LEVEL SECURITY;

-- Manufacturers can see ALL requests (production feed)
CREATE POLICY "requests_select_manufacturers"
  ON public.production_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'manufacturer'
    )
  );

-- Brands can see only their own requests
CREATE POLICY "requests_select_own_brand"
  ON public.production_requests FOR SELECT
  USING (brand_id = auth.uid());

-- Only brands can insert requests
CREATE POLICY "requests_insert_brand"
  ON public.production_requests FOR INSERT
  WITH CHECK (
    brand_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'brand'
    )
  );

-- Brands can update/delete only their own requests
CREATE POLICY "requests_update_own"
  ON public.production_requests FOR UPDATE
  USING (brand_id = auth.uid());

CREATE POLICY "requests_delete_own"
  ON public.production_requests FOR DELETE
  USING (brand_id = auth.uid());


-- ─────────────────────────────────────────────
-- 3. OFFERS
-- ─────────────────────────────────────────────
CREATE TABLE public.offers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid        NOT NULL REFERENCES public.production_requests(id) ON DELETE CASCADE,
  manufacturer_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price           numeric     NOT NULL CHECK (price >= 0),
  message         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, manufacturer_id)   -- one offer per manufacturer per request
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Manufacturers can see their own offers
CREATE POLICY "offers_select_own_manufacturer"
  ON public.offers FOR SELECT
  USING (manufacturer_id = auth.uid());

-- Brands can see offers on their own requests
CREATE POLICY "offers_select_brand_on_own_requests"
  ON public.offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.production_requests pr
      WHERE pr.id = offers.request_id
        AND pr.brand_id = auth.uid()
    )
  );

-- Only manufacturers can insert offers
CREATE POLICY "offers_insert_manufacturer"
  ON public.offers FOR INSERT
  WITH CHECK (
    manufacturer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'manufacturer'
    )
  );


-- ─────────────────────────────────────────────
-- 4. PORTFOLIO ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE public.portfolio_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url   text        NOT NULL,
  caption     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view portfolio items
CREATE POLICY "portfolio_select_public"
  ON public.portfolio_items FOR SELECT
  USING (true);

-- Owners can insert
CREATE POLICY "portfolio_insert_own"
  ON public.portfolio_items FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Owners can update
CREATE POLICY "portfolio_update_own"
  ON public.portfolio_items FOR UPDATE
  USING (profile_id = auth.uid());

-- Owners can delete
CREATE POLICY "portfolio_delete_own"
  ON public.portfolio_items FOR DELETE
  USING (profile_id = auth.uid());


-- ─────────────────────────────────────────────
-- 5. PROFILE LINKS
-- ─────────────────────────────────────────────
CREATE TABLE public.profile_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('instagram', 'website', 'whatsapp', 'email')),
  url         text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

-- Everyone can view links
CREATE POLICY "links_select_public"
  ON public.profile_links FOR SELECT
  USING (true);

-- Owners can insert
CREATE POLICY "links_insert_own"
  ON public.profile_links FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Owners can update
CREATE POLICY "links_update_own"
  ON public.profile_links FOR UPDATE
  USING (profile_id = auth.uid());

-- Owners can delete
CREATE POLICY "links_delete_own"
  ON public.profile_links FOR DELETE
  USING (profile_id = auth.uid());


-- ─────────────────────────────────────────────
-- 6. ACTIONS & PAYMENTS
-- ─────────────────────────────────────────────
CREATE TABLE public.actions_payments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type         text        NOT NULL CHECK (action_type IN (
                                    'brand_send_request',
                                    'manufacturer_send_offer',
                                    'manufacturer_accept_offer'
                                  )),
  actor_profile_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  related_request_id  uuid        REFERENCES public.production_requests(id) ON DELETE SET NULL,
  related_offer_id    uuid        REFERENCES public.offers(id) ON DELETE SET NULL,
  amount_gbp          numeric     NOT NULL,
  currency            text        NOT NULL DEFAULT 'GBP',
  payment_provider    text        NOT NULL DEFAULT 'stripe',
  payment_status      text        NOT NULL DEFAULT 'pending'
                                    CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_link_url    text,
  stripe_session_id   text,
  stripe_payment_intent_id text,
  -- Store offer payload until payment confirmed, then webhook creates the offer
  pending_offer_data  jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.actions_payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment records
CREATE POLICY "payments_select_own"
  ON public.actions_payments FOR SELECT
  USING (actor_profile_id = auth.uid());

-- Users can insert their own payment records
CREATE POLICY "payments_insert_own"
  ON public.actions_payments FOR INSERT
  WITH CHECK (actor_profile_id = auth.uid());

-- Users can update their own payment records (for pending → paid flow via client)
-- The webhook uses service_role key so it bypasses RLS
CREATE POLICY "payments_update_own"
  ON public.actions_payments FOR UPDATE
  USING (actor_profile_id = auth.uid());


-- ─────────────────────────────────────────────
-- TRIGGER: Auto-create profile on user signup
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'brand'),
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


-- ─────────────────────────────────────────────
-- INDEXES (performance)
-- ─────────────────────────────────────────────
CREATE INDEX idx_production_requests_brand_id  ON public.production_requests(brand_id);
CREATE INDEX idx_production_requests_created   ON public.production_requests(created_at DESC);
CREATE INDEX idx_offers_request_id             ON public.offers(request_id);
CREATE INDEX idx_offers_manufacturer_id        ON public.offers(manufacturer_id);
CREATE INDEX idx_portfolio_profile_id          ON public.portfolio_items(profile_id);
CREATE INDEX idx_links_profile_id              ON public.profile_links(profile_id);
CREATE INDEX idx_payments_actor                ON public.actions_payments(actor_profile_id);
CREATE INDEX idx_payments_session              ON public.actions_payments(stripe_session_id);
CREATE INDEX idx_profiles_role                 ON public.profiles(role);


-- ─────────────────────────────────────────────
-- STORAGE: Create portfolios bucket
-- (Run via Supabase dashboard or CLI if SQL bucket creation isn't supported)
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolios', 'portfolios', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "portfolios_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own uploads
CREATE POLICY "portfolios_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read of portfolios
CREATE POLICY "portfolios_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolios');
