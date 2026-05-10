import { NextRequest, NextResponse } from 'next/server'
import { stripe, ACTION_PRICES, ACTION_LABELS } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

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

    if (!action_type) {
      return NextResponse.json({ error: 'action_type is required' }, { status: 400 })
    }

    const amountPence = ACTION_PRICES[action_type] ?? 300
    const label = ACTION_LABELS[action_type] ?? 'D4TF Connect Action'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // If the action is free, skip Stripe entirely and create the resource directly
    if (amountPence === 0) {
      // e.g. brand_send_request is free — just record it
      const { data: payment, error: paymentError } = await supabase
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

    // Store pending offer data in the payment record so the webhook can create the offer
    const pendingOfferData =
      action_type === 'manufacturer_send_offer'
        ? {
            request_id: related_request_id,
            price: offer_price,
            message: offer_message,
          }
        : null

    // Create pending payment record first
    const { data: pendingPayment, error: pendingError } = await supabase
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
    await supabase
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
