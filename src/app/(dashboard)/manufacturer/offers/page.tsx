import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Offer, ProductionRequest } from '@/lib/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'

export default async function MyOffersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: offersRaw } = await supabase
    .from('offers')
    .select('*, request:production_requests(*)')
    .eq('manufacturer_id', user.id)
    .order('created_at', { ascending: false })

  const offers = (offersRaw ?? []) as (Offer & { request: ProductionRequest })[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/manufacturer" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to feed
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">My Offers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Offers you have sent to brands</p>
        </div>
      </div>

      {offers.length === 0 ? (
        <EmptyState
          icon="📤"
          title="No offers sent yet"
          description="Browse the production feed and send your first offer."
          action={
            <Link href="/manufacturer" className="btn-primary">
              Browse production feed
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <div key={offer.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {offer.request?.title ?? 'Production Request'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{offer.message}</p>
                  <div className="mt-2 text-xs text-gray-400">
                    Sent {formatDate(offer.created_at)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(offer.price)}</div>
                  <span className="badge bg-blue-100 text-blue-700 text-xs mt-1">Offer sent</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
