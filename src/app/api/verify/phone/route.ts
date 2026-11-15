import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Marks the user's phone as verified on their profile.
 *
 * Called by the client after supabase.auth.verifyOtp({ type: 'phone_change' })
 * succeeds. Rather than trusting the client, it reads the confirmed phone number
 * from Supabase Auth itself, so a user can't claim a number they never verified.
 */
export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (!user.phone || !user.phone_confirmed_at) {
      return NextResponse.json({ error: 'Phone number has not been verified yet' }, { status: 400 })
    }

    // Supabase Auth stores E.164 numbers without the leading "+"
    const phone = user.phone.startsWith('+') ? user.phone : `+${user.phone}`

    const admin = createServiceClient()
    const { error } = await admin
      .from('profiles')
      .update({ phone, phone_verified: true })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await admin.rpc('refresh_verification_tier', { profile_id: user.id })

    return NextResponse.json({ verified: true, phone })
  } catch (err) {
    console.error('[verify-phone]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
