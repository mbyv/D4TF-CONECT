import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Stripe requires the raw body for signature verification
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true })
    }

    const { action_payment_id, actor_profile_id, action_type } = session.metadata ?? {}

    if (!action_payment_id) {
      console.error('[webhook] Missing action_payment_id in metadata')
      return NextResponse.json({ received: true })
    }

    // Use service role to bypass RLS
    const supabase = createServiceClient()

    // Fetch the pending payment record (includes pending_offer_data)
    const { data: payment, error: fetchError } = await supabase
      .from('actions_payments')
      .select('*')
      .eq('id', action_payment_id)
      .single()

    if (fetchError || !payment) {
      console.error('[webhook] Payment record not found:', action_payment_id)
      return NextResponse.json({ received: true })
    }

    // Mark payment as paid
    const { error: updateError } = await supabase
      .from('actions_payments')
      .update({
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', action_payment_id)

    if (updateError) {
      console.error('[webhook] Failed to update payment status:', updateError)
    }

    // If this was a "send offer" action, create the offer record now
    if (action_type === 'manufacturer_send_offer' && payment.pending_offer_data) {
      const { request_id, price, message } = payment.pending_offer_data as {
        request_id: string
        price: number
        message: string
      }

      if (request_id && actor_profile_id) {
        const { error: offerError } = await supabase
          .from('offers')
          .insert({
            request_id,
            manufacturer_id: actor_profile_id,
            price,
            message,
          })

        if (offerError) {
          // Duplicate offer (unique constraint) is fine — idempotent
          if (!offerError.code?.includes('23505')) {
            console.error('[webhook] Failed to create offer:', offerError)
          }
        } else {
          // Link the offer back to the payment record
          const { data: offer } = await supabase
            .from('offers')
            .select('id')
            .eq('request_id', request_id)
            .eq('manufacturer_id', actor_profile_id)
            .single()

          if (offer) {
            await supabase
              .from('actions_payments')
              .update({ related_offer_id: offer.id })
              .eq('id', action_payment_id)
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
