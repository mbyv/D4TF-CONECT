'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type Status = 'loading' | 'confirmed' | 'error'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const supabase = createClient()

  const [status, setStatus] = useState<Status>('loading')
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return }

    async function confirm() {
      // Get current user's role for redirect links
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('error'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile) setRole(profile.role)

      // Call confirm-session — verifies with Stripe directly and creates the offer
      const res = await fetch('/api/stripe/confirm-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })

      const json = await res.json()

      if (res.ok && json.status === 'paid') {
        setStatus('confirmed')
      } else {
        setStatus('error')
      }
    }

    confirm()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="card p-8 max-w-sm w-full text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Confirming your payment…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Could not verify payment</h1>
        <p className="text-sm text-gray-500 mb-4">
          If you were charged, your offer will still appear in <strong>My Offers</strong>.
          If the problem persists, contact support.
        </p>
        <Link href={role === 'manufacturer' ? '/manufacturer/offers' : '/brand'} className="btn-secondary w-full">
          Check my offers
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-8 max-w-sm w-full text-center">
      <div className="text-4xl mb-3">🎉</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Offer submitted!</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your payment was confirmed and your offer has been sent to the brand.
        They will contact you directly via your profile links (Instagram, WhatsApp, etc.).
      </p>
      <div className="space-y-2">
        <Link href="/manufacturer/offers" className="btn-primary w-full">
          View my offers
        </Link>
        <Link href="/manufacturer" className="btn-secondary w-full">
          Back to production feed
        </Link>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-6">
        <Link href="/" className="font-bold text-brand-700 text-lg">D4TF Connect</Link>
      </div>
      <Suspense fallback={
        <div className="card p-8 max-w-sm w-full text-center">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
