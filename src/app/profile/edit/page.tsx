'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Profile, PortfolioItem, ProfileLink, LinkType } from '@/lib/types'
import ErrorMessage from '@/components/ui/ErrorMessage'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { LINK_LABELS, LINK_ICONS } from '@/lib/utils'

const LINK_TYPES: LinkType[] = ['instagram', 'website', 'whatsapp', 'email']

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [links, setLinks] = useState<ProfileLink[]>([])
  const [loadingPage, setLoadingPage] = useState(true)

  // Profile form state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Portfolio state
  const [uploadingImage, setUploadingImage] = useState(false)
  const [portfolioError, setPortfolioError] = useState('')

  // Links state
  const [newLinkType, setNewLinkType] = useState<LinkType>('instagram')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [linkError, setLinkError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [profileRes, portfolioRes, linksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('portfolio_items').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profile_links').select('*').eq('profile_id', user.id),
      ])

      if (profileRes.data) {
        const p = profileRes.data as Profile
        setProfile(p)
        setName(p.name ?? '')
        setBio(p.bio ?? '')
        setCity(p.city ?? '')
        setCountry(p.country ?? 'United Kingdom')
      }
      setPortfolio((portfolioRes.data ?? []) as PortfolioItem[])
      setLinks((linksRes.data ?? []) as ProfileLink[])
      setLoadingPage(false)
    }
    load()
  }, [router, supabase])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileError('')
    setProfileSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), bio: bio.trim(), city: city.trim(), country: country.trim() })
      .eq('id', user.id)

    if (error) setProfileError(error.message)
    else setProfileSuccess(true)
    setSavingProfile(false)
  }

  async function uploadPortfolioImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingImage(true)
    setPortfolioError('')

    const ext = file.name.split('.').pop()
    const path = `${profile.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('portfolios')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setPortfolioError(uploadError.message)
      setUploadingImage(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('portfolios')
      .getPublicUrl(path)

    const { data: newItem, error: insertError } = await supabase
      .from('portfolio_items')
      .insert({ profile_id: profile.id, image_url: publicUrl })
      .select()
      .single()

    if (insertError) setPortfolioError(insertError.message)
    else setPortfolio((prev) => [newItem as PortfolioItem, ...prev])

    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function deletePortfolioItem(item: PortfolioItem) {
    const path = item.image_url.split('/portfolios/')[1]
    await supabase.storage.from('portfolios').remove([path])
    await supabase.from('portfolio_items').delete().eq('id', item.id)
    setPortfolio((prev) => prev.filter((p) => p.id !== item.id))
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSavingLink(true)
    setLinkError('')

    const { data: newLink, error } = await supabase
      .from('profile_links')
      .insert({ profile_id: profile.id, type: newLinkType, url: newLinkUrl.trim() })
      .select()
      .single()

    if (error) setLinkError(error.message)
    else {
      setLinks((prev) => [...prev, newLink as ProfileLink])
      setNewLinkUrl('')
    }
    setSavingLink(false)
  }

  async function deleteLink(id: string) {
    await supabase.from('profile_links').delete().eq('id', id)
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  if (loadingPage) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-brand-700 text-lg tracking-tight">D4TF Connect</Link>
          {profile && (
            <Link href={`/profile/${profile.id}`} className="btn-ghost text-sm">View profile →</Link>
          )}
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Profile Info */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Profile Info</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea
                className="input h-28 resize-none"
                placeholder={profile?.role === 'manufacturer'
                  ? 'Tell brands about your factory: specialties, MOQ, capacity, certifications…'
                  : 'Tell manufacturers about your brand: style, target market, production goals…'}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">City</label>
                <input type="text" className="input" placeholder="e.g. London" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="label">Country</label>
                <input
                  type="text"
                  className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                  value="United Kingdom 🇬🇧"
                  readOnly
                  title="D4TF Connect is currently UK-only"
                />
              </div>
            </div>
            {profileError && <ErrorMessage message={profileError} />}
            {profileSuccess && (
              <p className="text-sm text-green-600 font-medium">Profile saved!</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>

        {/* Portfolio */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Portfolio Images</h2>
          <p className="text-xs text-gray-500 mb-4">
            {profile?.role === 'manufacturer'
              ? 'Upload photos of your factory, machinery, or finished garments.'
              : 'Upload lookbook shots or product photos.'}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {portfolio.map((item) => (
              <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt={item.caption ?? ''} className="w-full h-full object-cover" />
                <button
                  onClick={() => deletePortfolioItem(item)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {portfolioError && <ErrorMessage message={portfolioError} />}

          <label className={`btn-secondary w-full cursor-pointer text-center ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploadingImage ? 'Uploading…' : '+ Upload image'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadPortfolioImage}
              disabled={uploadingImage}
            />
          </label>
        </div>

        {/* Links */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Contact Links</h2>
          <p className="text-xs text-gray-500 mb-4">
            Add your Instagram, website, WhatsApp or email so brands/manufacturers can contact you.
          </p>

          {links.length > 0 && (
            <div className="space-y-2 mb-4">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-sm text-gray-700">
                    {LINK_ICONS[link.type]} <strong>{LINK_LABELS[link.type]}</strong>: {link.url}
                  </span>
                  <button onClick={() => deleteLink(link.id)} className="text-red-500 text-xs hover:text-red-700 ml-2">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {linkError && <ErrorMessage message={linkError} />}

          <form onSubmit={addLink} className="flex flex-col sm:flex-row gap-2">
            <select
              className="input sm:w-36 shrink-0"
              value={newLinkType}
              onChange={(e) => setNewLinkType(e.target.value as LinkType)}
            >
              {LINK_TYPES.map((t) => (
                <option key={t} value={t}>{LINK_ICONS[t]} {LINK_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="text"
              className="input flex-1"
              placeholder={
                newLinkType === 'instagram' ? '@yourbrand' :
                newLinkType === 'whatsapp' ? '+447700000000' :
                newLinkType === 'email' ? 'you@example.com' :
                'https://yourwebsite.com'
              }
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary shrink-0" disabled={savingLink}>
              {savingLink ? '…' : 'Add'}
            </button>
          </form>
        </div>

        {profile && (
          <Link href={`/profile/${profile.id}`} className="btn-secondary w-full text-center block">
            View my profile →
          </Link>
        )}
      </div>
    </div>
  )
}
