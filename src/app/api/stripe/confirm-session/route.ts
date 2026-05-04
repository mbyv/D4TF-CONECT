import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function createServiceClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Called by the success page to verify payment and create the offer.
 * Acts as a reliable fallback alongside the webhook.
 * Idempotent — safe to call multiple times.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { session_id } = await request.json() as { session_id: string }
    if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

    // Verify payment status directly with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'unpaid' })
    }

    // Use service role so we can update regardless of RLS
    const admin = createServiceClient()

    // Fetch the payment record
    const { data: payment } = await admin
      .from('actions_payments')
      .select('*')
      .eq('stripe_session_id', session_id)
      .single()

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // Mark as paid (idempotent)
    if (payment.payment_status !== 'paid') {
      await admin
        .from('actions_payments')
        .update({
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', payment.id)
    }

    // Create the offer if this was a "send offer" action and it doesn't exist yet
    if (payment.action_type === 'manufacturer_send_offer' && payment.pending_offer_data) {
      const { request_id, price, message } = payment.pending_offer_data as {
        request_id: string
        price: number
        message: string
      }

      // Check if offer already exists (webhook may have already created it)
      const { data: existingOffer } = await admin
        .from('offers')
        .select('id')
        .eq('request_id', request_id)
        .eq('manufacturer_id', user.id)
        .single()

      if (!existingOffer) {
        const { data: newOffer } = await admin
          .from('offers')
          .insert({
            request_id,
            manufacturer_id: user.id,
            price,
            message,
          })
          .select('id')
          .single()

        if (newOffer) {
          await admin
            .from('actions_payments')
            .update({ related_offer_id: newOffer.id })
            .eq('id', payment.id)
        }
      }
    }

    return NextResponse.json({ status: 'paid', action_type: payment.action_type })
  } catch (err) {
    console.error('[confirm-session]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
