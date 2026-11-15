# D4TF Connect – Setup Guide

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend**: Supabase (Auth, Postgres, Storage)
- **Payments**: Stripe Checkout (GBP, pay-per-action)
- **Deployment**: Vercel (recommended)

---

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run the full contents of `supabase/migrations/001_initial_schema.sql`
3. That creates all 6 tables, RLS policies, triggers, indexes, and the `portfolios` storage bucket
4. Then run the remaining migrations **in order**: `002_verification.sql`, `003_portfolio_min5.sql`, `004_security_hardening.sql`
   (004 locks payments, offers and verification fields so only server code can write them — deploy the app code before running it)

**Supabase keys you need** (Project Settings → API):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — only used server-side)

---

## 2. Stripe Setup

1. Create an account at [stripe.com](https://stripe.com) — enable **GBP** as currency
2. Copy your API keys (Developers → API Keys):
   - `STRIPE_SECRET_KEY` (sk_live_… or sk_test_… for testing)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Set up a webhook (Developers → Webhooks):
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for: `checkout.session.completed`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

**For local testing**, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
This gives you a local webhook secret starting with `whsec_`.

---

## 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Prices in pence (100 = £1.00)
SEND_OFFER_PRICE_PENCE=300   # £3 to send an offer
POST_REQUEST_PRICE_PENCE=0   # Free to post a request
```

---

## 4. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 5. Deployment (Vercel)

1. Push this repo to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all env vars in the Vercel dashboard (Settings → Environment Variables)
4. Deploy
5. Update `NEXT_PUBLIC_APP_URL` to your production URL
6. Update your Stripe webhook endpoint URL to the production domain

---

## User Flows

### Brand
1. Sign up → role: **brand**
2. Fill profile + add portfolio images + links (Edit Profile)
3. Brand Dashboard → **New Request** (free)
4. Brand Dashboard → click a request → view all offers received
5. Click "View manufacturer profile" → use their contact links to reach out

### Manufacturer
1. Sign up → role: **manufacturer**
2. Fill profile + add factory/product photos + contact links
3. Manufacturer Dashboard → browse **Production Feed**
4. Click **Send Offer – £3** on any request
5. Fill price + message → pay £3 via Stripe
6. Offer is created automatically after payment confirmation
7. Check **My Offers** to see all submitted offers

---

## Pay-Per-Action Logic

| Action | Cost | Who pays |
|--------|------|----------|
| Post a production request | Free | Brand |
| Send an offer | £3 | Manufacturer |

The `actions_payments` table tracks every payment. The Stripe webhook
(`/api/stripe/webhook`) updates `payment_status = 'paid'` and
atomically creates the `offers` row once payment is confirmed.

---

## Database Schema

```
profiles           – both brands and manufacturers
production_requests – posted by brands
offers             – sent by manufacturers (requires paid action)
portfolio_items    – images per profile
profile_links      – instagram/website/whatsapp/email per profile
actions_payments   – every pay-per-action transaction
```

All tables have Row Level Security enabled.
