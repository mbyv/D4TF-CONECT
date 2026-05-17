'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ErrorMessage from '@/components/ui/ErrorMessage'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function NewRequestPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tier, setTier] = useState<string | null>(null)
  const [checkingTier, setCheckingTier] = useState(true)

  useEffect(() => {
    async function checkVerification() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('verification_tier')
        .eq('id', user.id)
        .single()
      setTier(data?.verification_tier ?? 'unverified')
      setCheckingTier(false)
    }
    checkVerification()
  }, [router, supabase])

  const isVerified = tier === 'verified' || tier === 'trusted'

  if (checkingTier) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  if (!isVerified) {
    return (
      <div className="max-w-xl">
        <Link href="/brand" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to dashboard
        </Link>
        <div className="card p-8 mt-4 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verification required</h1>
          <p className="text-sm text-gray-500 mb-6">
            You need to be <strong>Verified</strong> before you can post production requests.
            Complete your profile to unlock this feature.
          </p>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 text-left mb-6 space-y-1">
            <p className="font-semibold mb-2">To get Verified you need to:</p>
            <p>🔵 Verify your UK phone number</p>
            <p>📝 Write a bio (min. 40 characters)</p>
            <p>📍 Add your city</p>
            <p>🔗 Add a contact link (Instagram, WhatsApp, etc.)</p>
          </div>
          <Link href="/profile/edit" className="btn-primary w-full">
            Complete my profile →
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: insertError } = await supabase
      .from('production_requests')
      .insert({
        brand_id: user.id,
        title: title.trim(),
        description: description.trim(),
        quantity: parseInt(quantity, 10),
        budget: parseFloat(budget),
        deadline,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/brand')
    router.refresh()
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link href="/brand" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Post a Production Request</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe what you need. Manufacturers will see this in their live feed.
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="label">Request title *</label>
            <input
              id="title"
              type="text"
              className="input"
              placeholder="e.g. 500 units women's oversized blazer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
            <p className="mt-1 text-xs text-gray-400">Be specific — manufacturers scan titles first.</p>
          </div>

          <div>
            <label htmlFor="description" className="label">Description *</label>
            <textarea
              id="description"
              className="input h-28 resize-none"
              placeholder="Fabric type, style details, quality standards, delivery requirements, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-amber-600 font-medium">
              💡 Include your email, WhatsApp number, or Instagram handle so manufacturers can reach you directly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="label">Quantity (units) *</label>
              <input
                id="quantity"
                type="number"
                className="input"
                placeholder="e.g. 500"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="budget" className="label">Budget (£) *</label>
              <input
                id="budget"
                type="number"
                className="input"
                placeholder="e.g. 5000"
                min={0}
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="deadline" className="label">Deadline *</label>
            <input
              id="deadline"
              type="date"
              className="input"
              min={new Date().toISOString().split('T')[0]}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Posting…' : 'Post Request (Free)'}
            </button>
            <Link href="/brand" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Posting is free. Manufacturers pay £3 per offer they send.
      </p>
    </div>
  )
}
