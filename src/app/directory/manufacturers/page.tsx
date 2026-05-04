import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'

export default async function ManufacturerDirectoryPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'manufacturer')
    .order('created_at', { ascending: false })

  const manufacturers = (data ?? []) as Profile[]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-brand-700 text-lg tracking-tight">D4TF Connect</Link>
          <div className="flex gap-2">
            <Link href="/directory/brands" className="btn-ghost text-sm">Brands</Link>
            <Link href="/login" className="btn-secondary text-sm">Log in</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manufacturer Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            {manufacturers.length} manufacturer{manufacturers.length !== 1 ? 's' : ''} registered on D4TF Connect
          </p>
        </div>

        {manufacturers.length === 0 ? (
          <EmptyState
            icon="🏭"
            title="No manufacturers yet"
            description="Be the first manufacturer to join D4TF Connect."
            action={<Link href="/signup" className="btn-primary">Sign up as a Manufacturer</Link>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {manufacturers.map((mfr) => (
              <Link
                key={mfr.id}
                href={`/profile/${mfr.id}`}
                className="card p-5 hover:shadow-md transition-shadow flex items-start gap-4"
              >
                {mfr.profile_image_url ? (
                  <Image
                    src={mfr.profile_image_url}
                    alt={mfr.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold shrink-0">
                    {mfr.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{mfr.name}</span>
                    {mfr.verified && (
                      <span className="badge bg-blue-100 text-blue-700 text-[10px]">✓</span>
                    )}
                  </div>
                  {(mfr.city || mfr.country) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      📍 {[mfr.city, mfr.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {mfr.bio && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mfr.bio}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">Joined {formatDate(mfr.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
