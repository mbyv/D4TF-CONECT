import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'brand') redirect('/brand')
    if (profile?.role === 'manufacturer') redirect('/manufacturer')
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-brand-700 text-lg tracking-tight">D4TF Connect</span>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-sm">Log in</Link>
            <Link href="/signup" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <span className="badge bg-brand-100 text-brand-700 mb-4">🇬🇧 UK B2B Fashion Marketplace</span>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          UK Fashion Brands.<br />
          <span className="text-brand-600">Meet UK Manufacturers.</span>
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
          D4TF Connect is the UK&apos;s B2B fashion marketplace. Brands post production requests.
          Manufacturers send competitive offers. Pay only per action — no subscriptions.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Start for free →
          </Link>
          <Link href="/directory/manufacturers" className="btn-secondary text-base px-6 py-3">
            Browse manufacturers
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-sm text-gray-400 mb-8">🇬🇧 Currently available to UK-based brands and manufacturers only</p>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4 text-2xl">🏷️</div>
              <h3 className="font-semibold text-gray-900 mb-2">UK Brand posts a request</h3>
              <p className="text-sm text-gray-500">
                Describe your production run — garment type, quantity, budget, and deadline.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4 text-2xl">🏭</div>
              <h3 className="font-semibold text-gray-900 mb-2">UK Manufacturers send offers</h3>
              <p className="text-sm text-gray-500">
                UK manufacturers browse the live feed and send competitive offers (£3 per offer).
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4 text-2xl">🤝</div>
              <h3 className="font-semibold text-gray-900 mb-2">Brand picks the best fit</h3>
              <p className="text-sm text-gray-500">
                Review portfolios, contact via WhatsApp or email, and proceed off-platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Simple pay-per-action pricing</h2>
          <p className="text-gray-500 mb-10">No subscriptions. No monthly fees. Pay only when you act.</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="card p-6 text-left">
              <div className="badge bg-blue-100 text-blue-700 mb-3">For Brands</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">Free</div>
              <div className="text-sm text-gray-500 mb-4">to post a production request</div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span>✓</span> Unlimited requests</li>
                <li className="flex gap-2"><span>✓</span> Receive all offers at no cost</li>
                <li className="flex gap-2"><span>✓</span> Browse manufacturer portfolios</li>
              </ul>
            </div>
            <div className="card p-6 text-left border-brand-200">
              <div className="badge bg-brand-100 text-brand-700 mb-3">For Manufacturers</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">£3</div>
              <div className="text-sm text-gray-500 mb-4">per offer sent</div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span>✓</span> Access full production feed</li>
                <li className="flex gap-2"><span>✓</span> Direct brand contact details</li>
                <li className="flex gap-2"><span>✓</span> Portfolio showcase</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold text-brand-700">D4TF Connect</span>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/directory/brands">Brand Directory</Link>
            <Link href="/directory/manufacturers">Manufacturer Directory</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
