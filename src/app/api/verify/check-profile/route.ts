import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Recalculates and returns the current verification tier for the
 * authenticated user. Called from the client after any profile change.
 */
export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Trigger server-side tier recalculation
    await supabase.rpc('refresh_verification_tier', { profile_id: user.id })

    // Return updated profile so client can refresh UI
    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_tier, verified, phone_verified, companies_house_verified')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[check-profile]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
