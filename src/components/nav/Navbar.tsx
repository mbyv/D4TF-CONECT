'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

interface NavbarProps {
  profile: Profile | null
}

export default function Navbar({ profile }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const dashboardHref = profile?.role === 'brand' ? '/brand' : '/manufacturer'

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={profile ? dashboardHref : '/'} className="font-bold text-brand-700 text-lg tracking-tight">
          D4TF Connect
        </Link>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <Link
                href={`/directory/${profile.role === 'brand' ? 'manufacturers' : 'brands'}`}
                className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                {profile.role === 'brand' ? 'Find Manufacturers' : 'Browse Brands'}
              </Link>
              <Link
                href={`/profile/${profile.id}`}
                className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                My Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="btn-secondary text-xs"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
