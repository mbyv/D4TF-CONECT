'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ProductionRequest, Profile } from '@/lib/types'
import { formatDate, formatCurrency, formatQuantity } from '@/lib/utils'
import ErrorMessage from '@/components/ui/ErrorMessage'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function SendOfferPage() {
  const params = useParams()
  const requestId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [request, setRequest] = useState<(ProductionRequest & { brand: Profile }) | null>(null)
  const [loadingRequest, setLoadingRequest] = useState(true)

  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('production_requests')
        .select('*, brand:profiles(*)')
        .eq('id', requestId)
        .single()
      setRequest(data as (ProductionRequest & { brand: Profile }) | null)
      setLoadingRequest(false)
    }
    load()
  }, [requestId, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check if already offered
    const { data: existing } = await supabase
      .from('offers')
      .select('id')
      .eq('request_id', requestId)
      .eq('manufacturer_id', user.id)
      .single()

    if (existing) {
      setError('You have already sent an offer for this request.')
      setLoading(false)
      return
    }

    // Create pending payment record + initiate Stripe checkout
    const res = await fetch('/api/stripe/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: 'manufacturer_send_offer',
        related_request_id: requestId,
        offer_price: parseFloat(price),
        offer_message: message.trim(),
      }),
    })

    const json = await res.json()

    if (!res.ok || !json.checkout_url) {
      setError(json.error ?? 'Could not initiate payment. Please try again.')
      setLoading(false)
      return
    }

    // Redirect to Stripe Checkout
    window.location.href = json.checkout_url
  }

  if (loadingRequest) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Request not found.</p>
        <Link href="/manufacturer" className="btn-primary mt-4">Back to feed</Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <Link href="/manufacturer" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to feed
      </Link>

      {/* Request summary */}
      <div className="card p-5 mt-4 bg-gray-50 border-gray-200">
        <div className="text-xs text-brand-600 font-medium mb-1">
          Request from {request.brand?.name ?? 'Brand'}
        </div>
        <h2 className="font-semibold text-gray-900">{request.title}</h2>
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
          <span>{formatQuantity(request.quantity)}</span>
          <span>·</span>
          <span>Budget: {formatCurrency(request.budget)}</span>
          <span>·</span>
          <span>Deadline: {formatDate(request.deadline)}</span>
        </div>
        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{request.description}</p>
      </div>

      {/* Offer form */}
      <div className="card p-6 mt-4">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Send Your Offer</h1>
        <p className="text-sm text-gray-500 mb-5">
          A one-time fee of <strong>£3</strong> is charged per offer via Stripe.
          Your offer is submitted immediately after payment.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="price" className="label">Your price (£) *</label>
            <input
              id="price"
              type="number"
              className="input"
              placeholder="e.g. 4200"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-gray-400">Total price for the full order described above.</p>
          </div>

          <div>
            <label htmlFor="message" className="label">Message to the brand *</label>
            <textarea
              id="message"
              className="input h-32 resize-none"
              placeholder={`Introduce your factory, mention your MOQ, production capacity, lead time, and why you're a great fit.`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-amber-600 font-medium">
              💡 Include your email, WhatsApp number, or Instagram handle so the brand can contact you directly.
            </p>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="rounded-lg bg-brand-50 border border-brand-200 p-3 text-sm text-brand-800">
            <strong>Payment:</strong> You will be redirected to Stripe to pay £3.
            Your offer is created automatically on successful payment.
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Preparing checkout…' : 'Pay £3 & Submit Offer'}
            </button>
            <Link href="/manufacturer" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
