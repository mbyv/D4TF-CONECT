import { NextRequest, NextResponse } from 'next/server'
import { stripe, ACTION_PRICES, ACTION_LABELS } from '@/lib/stripe'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/** Which role is allowed to perform each paid/free action. */
const ACTION_ROLES: Record<string, 'brand' | 'manufacturer'> = {
  brand_send_request: 'brand',
  manufacturer_send_offer: 'manufacturer',
}

const MAX_MESSAGE_LENGTH = 5000

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { action_type, related_request_id, offer_price, offer_message } = body as {
      action_type: string
      related_request_id?: string
      offer_price?: number
      offer_message?: string
    }

    const requiredRole = ACTION_ROLES[action_type]
    if (!requiredRole) {
      return NextResponse.json({ error: 'Unsupported action_type' }, { status: 400 })
    }

    // Payment records and offers are written with the service role (users have no
    // write access to these tables), so every check RLS used to do happens here.
    const admin = createServiceClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== requiredRole) {
      return NextResponse.json({ error: 'Your account type cannot perform this action' }, { status: 403 })
    }

    let pendingOfferData: { request_id: string; price: number; message: string } | null = null

    if (action_type === 'manufacturer_send_offer') {
      const price = Number(offer_price)
      const message = (offer_message ?? '').trim()

      if (!related_request_id) {
        return NextResponse.json({ error: 'related_request_id is required' }, { status: 400 })
      }
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Offer price must be a positive number' }, { status: 400 })
      }
      if (!message || message.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json({ error: 'Offer message is required (max 5000 characters)' }, { status: 400 })
      }

      const { data: productionRequest } = await admin
        .from('production_requests')
        .select('id')
        .eq('id', related_request_id)
        .single()

      if (!productionRequest) {
        return NextResponse.json({ error: 'Production request not found' }, { status: 404 })
      }

      const { data: existingOffer } = await admin
        .from('offers')
        .select('id')
        .eq('request_id', related_request_id)
        .eq('manufacturer_id', user.id)
        .maybeSingle()

      if (existingOffer) {
        return NextResponse.json({ error: 'You have already sent an offer for this request.' }, { status: 409 })
      }

      pendingOfferData = { request_id: related_request_id, price, message }
    }

    const amountPence = ACTION_PRICES[action_type] ?? 300
    const label = ACTION_LABELS[action_type] ?? 'D4TF Connect Action'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // If the action is free, skip Stripe entirely and just record it
    if (amountPence === 0) {
      const { data: payment, error: paymentError } = await admin
        .from('actions_payments')
        .insert({
          action_type,
          actor_profile_id: user.id,
          related_request_id: related_request_id ?? null,
          amount_gbp: 0,
          payment_status: 'paid',
          payment_provider: 'none',
        })
        .select()
        .single()

      if (paymentError) {
        return NextResponse.json({ error: paymentError.message }, { status: 500 })
      }

      return NextResponse.json({ free: true, payment_id: payment.id })
    }

    // Create pending payment record first; the offer payload is parked here
    // until Stripe confirms payment (webhook / confirm-session create the offer).
    const { data: pendingPayment, error: pendingError } = await admin
      .from('actions_payments')
      .insert({
        action_type,
        actor_profile_id: user.id,
        related_request_id: related_request_id ?? null,
        amount_gbp: amountPence / 100,
        payment_status: 'pending',
        payment_provider: 'stripe',
        pending_offer_data: pendingOfferData,
      })
      .select()
      .single()

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    // Create Stripe Checkout Session (UK only)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'gbp',
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: amountPence,
            product_data: { name: label },
          },
          quantity: 1,
        },
      ],
      metadata: {
        action_payment_id: pendingPayment.id,
        actor_profile_id: user.id,
        action_type,
        related_request_id: related_request_id ?? '',
      },
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/cancel`,
    })

    // Save session ID to the payment record
    await admin
      .from('actions_payments')
      .update({
        stripe_session_id: session.id,
        payment_link_url: session.url,
      })
      .eq('id', pendingPayment.id)

    return NextResponse.json({ checkout_url: session.url, session_id: session.id })
  } catch (err) {
    console.error('[create-payment]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
