import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency, formatQuantity } from '@/lib/utils'
import { Offer, ProductionRequest, Profile, VerificationTier } from '@/lib/types'
import EmptyState from '@/components/ui/EmptyState'
import VerificationBadge from '@/components/profile/VerificationBadge'

interface Props {
  params: { id: string }
}

export default async function RequestDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch request (RLS ensures this user owns it)
  const { data: request } = await supabase
    .from('production_requests')
    .select('*')
    .eq('id', params.id)
    .eq('brand_id', user.id)
    .single()

  if (!request) notFound()

  const req = request as ProductionRequest

  // Fetch offers with manufacturer profile joined
  const { data: offersRaw } = await supabase
    .from('offers')
    .select('*, manufacturer:profiles(*)')
    .eq('request_id', params.id)
    .order('created_at', { ascending: false })

  const offers = (offersRaw ?? []) as (Offer & { manufacturer: Profile })[]

  return (
    <div className="max-w-3xl">
      <Link href="/brand" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to dashboard
      </Link>

      {/* Request Summary */}
      <div className="card p-6 mt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{req.title}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              <span>{formatQuantity(req.quantity)}</span>
              <span>·</span>
              <span>Budget: {formatCurrency(req.budget)}</span>
              <span>·</span>
              <span>Deadline: {formatDate(req.deadline)}</span>
              <span>·</span>
              <span>Posted {formatDate(req.created_at)}</span>
            </div>
          </div>
          <span className="badge bg-green-100 text-green-700 shrink-0">Live</span>
        </div>
        <p className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {req.description}
        </p>
      </div>

      {/* Offers */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Offers received
          <span className="ml-2 badge bg-gray-100 text-gray-600">{offers.length}</span>
        </h2>

        {offers.length === 0 ? (
          <EmptyState
            icon="📬"
            title="No offers yet"
            description="Manufacturers will send offers once they spot your request in their feed. Check back soon."
          />
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {offer.manufacturer.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={offer.manufacturer.profile_image_url}
                        alt={offer.manufacturer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                        {offer.manufacturer.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {offer.manufacturer.name}
                        </span>
                        <VerificationBadge
                          tier={(offer.manufacturer.verification_tier as VerificationTier) ?? 'unverified'}
                          size="sm"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {[offer.manufacturer.city, offer.manufacturer.country]
                          .filter(Boolean)
                          .join(', ') || 'Location not set'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(offer.price)}
                    </div>
                    <div className="text-xs text-gray-400">{formatDate(offer.created_at)}</div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                  {offer.message}
                </p>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/profile/${offer.manufacturer_id}`}
                    className="btn-primary text-xs"
                  >
                    View manufacturer profile →
                  </Link>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Contact this manufacturer via their profile links (Instagram, WhatsApp, etc.) to continue.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
