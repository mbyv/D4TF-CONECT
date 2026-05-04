import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductionRequest, Profile } from '@/lib/types'
import { formatDate, formatCurrency, formatQuantity } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'

export default async function ManufacturerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manufacturer') redirect('/brand')

  // Full production feed – all requests, newest first
  const { data: requestsRaw } = await supabase
    .from('production_requests')
    .select('*, brand:profiles(*)')
    .order('created_at', { ascending: false })

  const requests = (requestsRaw ?? []) as (ProductionRequest & { brand: Profile })[]

  // Which request IDs has this manufacturer already offered on?
  const { data: myOffers } = await supabase
    .from('offers')
    .select('request_id')
    .eq('manufacturer_id', user.id)

  const offeredOn = new Set((myOffers ?? []).map((o) => o.request_id))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live requests from brands — send an offer for £3
          </p>
        </div>
        <Link href="/manufacturer/offers" className="btn-secondary text-sm">
          My Offers
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <Link href="/directory/brands" className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🏷️</div>
          <div className="text-sm font-medium text-gray-900">Brand Directory</div>
          <div className="text-xs text-gray-500 mt-0.5">Browse all brands</div>
        </Link>
        <Link href={`/profile/${user.id}`} className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">👤</div>
          <div className="text-sm font-medium text-gray-900">My Profile</div>
          <div className="text-xs text-gray-500 mt-0.5">Add portfolio & links</div>
        </Link>
        <Link href="/profile/edit" className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">✏️</div>
          <div className="text-sm font-medium text-gray-900">Edit Profile</div>
          <div className="text-xs text-gray-500 mt-0.5">Update your info</div>
        </Link>
      </div>

      {/* Feed */}
      {requests.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No production requests yet"
          description="Brands will post requests here. Check back soon."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const alreadyOffered = offeredOn.has(req.id)
            return (
              <div key={req.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/profile/${req.brand_id}`}
                        className="text-xs text-brand-600 font-medium hover:underline"
                      >
                        {req.brand?.name ?? 'Brand'}
                      </Link>
                      {req.brand?.verified && (
                        <span className="badge bg-blue-100 text-blue-700 text-[10px]">✓ Verified</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-tight">{req.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{req.description}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{formatQuantity(req.quantity)}</span>
                      <span>·</span>
                      <span>Budget: <span className="font-medium text-gray-700">{formatCurrency(req.budget)}</span></span>
                      <span>·</span>
                      <span>Deadline: {formatDate(req.deadline)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-gray-400 mb-2">{formatDate(req.created_at)}</div>
                    {alreadyOffered ? (
                      <span className="badge bg-green-100 text-green-700">Offer sent</span>
                    ) : (
                      <Link
                        href={`/manufacturer/offer/${req.id}`}
                        className="btn-primary text-xs whitespace-nowrap"
                      >
                        Send Offer – £3
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
