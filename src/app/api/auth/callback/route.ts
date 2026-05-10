import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Fetch role and redirect to correct dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'manufacturer') {
        return NextResponse.redirect(`${origin}/manufacturer`)
      }
      return NextResponse.redirect(`${origin}/brand`)
    }
  }

  // If something went wrong, send to login with a message
  return NextResponse.redirect(`${origin}/login?message=Email confirmed! Please sign in.`)
}
