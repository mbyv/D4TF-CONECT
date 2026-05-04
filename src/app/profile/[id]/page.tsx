import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Profile, PortfolioItem, ProfileLink, ProductionRequest, Offer } from '@/lib/types'
import { formatDate, LINK_ICONS, LINK_LABELS, getLinkHref } from '@/lib/utils'

interface Props {
  params: { id: string }
}

export default async function ProfilePage({ params }: Props) {
  const supabase = createClient()

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!profileRaw) notFound()

  const profile = profileRaw as Profile

  // Fetch portfolio, links, and stats in parallel
  const [portfolioRes, linksRes, statsRes] = await Promise.all([
    supabase
      .from('portfolio_items')
      .select('*')
      .eq('profile_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profile_links')
      .select('*')
      .eq('profile_id', params.id),
    profile.role === 'brand'
      ? supabase
          .from('production_requests')
          .select('id', { count: 'exact' })
          .eq('brand_id', params.id)
      : supabase
          .from('offers')
          .select('id', { count: 'exact' })
          .eq('manufacturer_id', params.id),
  ])

  const portfolio = (portfolioRes.data ?? []) as PortfolioItem[]
  const links = (linksRes.data ?? []) as ProfileLink[]
  const statsCount = statsRes.count ?? 0

  // Get current user to show "Edit" button if own profile
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === params.id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-brand-700 text-lg tracking-tight">
            D4TF Connect
          </Link>
          <div className="flex gap-2">
            {isOwnProfile && (
              <Link href="/profile/edit" className="btn-secondary text-sm">
                Edit profile
              </Link>
            )}
            {user && (
              <Link
                href={profile.role === 'brand' ? '/brand' : '/manufacturer'}
                className="btn-ghost text-sm"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header Card */}
        <div className="card p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.profile_image_url ? (
                <Image
                  src={profile.profile_image_url}
                  alt={profile.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-2xl">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
                {profile.verified && (
                  <span className="badge bg-blue-100 text-blue-700">✓ Verified</span>
                )}
                <span className={`badge ${
                  profile.role === 'brand'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {profile.role === 'brand' ? '🏷️ Brand' : '🏭 Manufacturer'}
                </span>
              </div>

              {(profile.city || profile.country) && (
                <p className="text-sm text-gray-500">
                  📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div>
              <div className="text-2xl font-bold text-gray-900">{statsCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {profile.role === 'brand' ? 'Production requests posted' : 'Offers sent'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatDate(profile.created_at)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Member since</div>
            </div>
          </div>
        </div>

        {/* About */}
        {profile.bio && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </div>
        )}

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolio.map((item) => (
                <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={item.image_url}
                    alt={item.caption ?? 'Portfolio image'}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {links.length > 0 && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Contact & Links</h2>
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={getLinkHref(link.type, link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm gap-2"
                >
                  <span>{LINK_ICONS[link.type]}</span>
                  {LINK_LABELS[link.type]}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for own profile with no portfolio/links */}
        {isOwnProfile && portfolio.length === 0 && links.length === 0 && (
          <div className="card p-6 bg-amber-50 border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-1">Complete your profile</h3>
            <p className="text-sm text-amber-700 mb-4">
              Add portfolio images and contact links to build trust with{' '}
              {profile.role === 'brand' ? 'manufacturers' : 'brands'}.
            </p>
            <Link href="/profile/edit" className="btn-primary text-sm">
              Add portfolio & links
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
