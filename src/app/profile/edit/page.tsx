'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Profile, PortfolioItem, ProfileLink, LinkType, VerificationTier } from '@/lib/types'
import ErrorMessage from '@/components/ui/ErrorMessage'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import VerificationChecklist from '@/components/profile/VerificationChecklist'
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

  // Profile form
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Portfolio
  const [uploadingImage, setUploadingImage] = useState(false)
  const [portfolioError, setPortfolioError] = useState('')

  // Links
  const [newLinkType, setNewLinkType] = useState<LinkType>('instagram')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [linkError, setLinkError] = useState('')

  // Phone OTP
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [phoneSuccess, setPhoneSuccess] = useState(false)

  // Verification tier
  const [tier, setTier] = useState<VerificationTier>('unverified')

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
        setPhone(p.phone ?? '')
        setTier(p.verification_tier ?? 'unverified')
        if (p.phone_verified) setPhoneSuccess(true)
      }
      setPortfolio((portfolioRes.data ?? []) as PortfolioItem[])
      setLinks((linksRes.data ?? []) as ProfileLink[])
      setLoadingPage(false)
    }
    load()
  }, [router, supabase])

  async function refreshTier() {
    const res = await fetch('/api/verify/check-profile', { method: 'POST' })
    const json = await res.json()
    if (json.profile) setTier(json.profile.verification_tier)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileError('')
    setProfileSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), bio: bio.trim(), city: city.trim(), country: 'United Kingdom' })
      .eq('id', user.id)

    if (error) { setProfileError(error.message); setSavingProfile(false); return }
    setProfileSuccess(true)
    setSavingProfile(false)
    await refreshTier()
  }

  // ── Phone OTP ──────────────────────────────────────────────────────────────

  function formatUkPhone(raw: string): string {
    let n = raw.trim().replace(/\s+/g, '').replace(/[^\d+]/g, '')
    if (n.startsWith('+44')) return n
    if (n.startsWith('0')) n = n.slice(1)
    return '+44' + n
  }

  function isValidUkMobile(raw: string): boolean {
    const n = raw.trim().replace(/\s+/g, '').replace(/[^\d]/g, '')
    // Accept 07xxxxxxxxx (11 digits) or 7xxxxxxxxx (10 digits)
    const local = n.startsWith('0') ? n.slice(1) : n
    return /^7\d{9}$/.test(local)
  }

  async function sendOtp() {
    setPhoneError('')

    if (!isValidUkMobile(phone)) {
      setPhoneError('Please enter a valid UK mobile number (e.g. 07700 900 000).')
      return
    }

    setSendingOtp(true)
    const formatted = formatUkPhone(phone)

    const { error } = await supabase.auth.updateUser({ phone: formatted })

    if (error) {
      setPhoneError(error.message)
      setSendingOtp(false)
      return
    }

    setPhone(formatted)
    setOtpSent(true)
    setSendingOtp(false)
  }

  async function verifyOtp() {
    setVerifyingOtp(true)
    setPhoneError('')

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otpCode,
      type: 'phone_change',
    })

    if (error) {
      setPhoneError(error.message)
      setVerifyingOtp(false)
      return
    }

    // Mark phone as verified – done server-side, which re-checks the confirmed
    // number with Supabase Auth (verification fields are locked for clients).
    const res = await fetch('/api/verify/phone', { method: 'POST' })
    if (!res.ok) {
      const { error: apiError } = await res.json().catch(() => ({ error: 'Could not save verification' }))
      setPhoneError(apiError ?? 'Could not save verification')
      setVerifyingOtp(false)
      return
    }

    setPhoneSuccess(true)
    setVerifyingOtp(false)
    setOtpSent(false)
    await refreshTier()
  }

  // ── Portfolio ──────────────────────────────────────────────────────────────

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

    if (uploadError) { setPortfolioError(uploadError.message); setUploadingImage(false); return }

    const { data: { publicUrl } } = supabase.storage.from('portfolios').getPublicUrl(path)

    const { data: newItem, error: insertError } = await supabase
      .from('portfolio_items')
      .insert({ profile_id: profile.id, image_url: publicUrl })
      .select()
      .single()

    if (insertError) setPortfolioError(insertError.message)
    else {
      setPortfolio((prev) => [newItem as PortfolioItem, ...prev])
      await refreshTier()
    }

    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function deletePortfolioItem(item: PortfolioItem) {
    const path = item.image_url.split('/portfolios/')[1]
    await supabase.storage.from('portfolios').remove([path])
    await supabase.from('portfolio_items').delete().eq('id', item.id)
    setPortfolio((prev) => prev.filter((p) => p.id !== item.id))
    await refreshTier()
  }

  // ── Links ──────────────────────────────────────────────────────────────────

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
      await refreshTier()
    }
    setSavingLink(false)
  }

  async function deleteLink(id: string) {
    await supabase.from('profile_links').delete().eq('id', id)
    setLinks((prev) => prev.filter((l) => l.id !== id))
    await refreshTier()
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loadingPage) {
    return (
      <div className="flex justify-center py-20"><LoadingSpinner /></div>
    )
  }

  const hasFullBio = bio.trim().length >= 40
  const hasCity = city.trim().length > 0
  const hasPortfolio = portfolio.length >= 5
  const hasLink = links.length > 0

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

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

        {/* Verification Checklist */}
        <VerificationChecklist
          tier={tier}
          phoneVerified={profile?.phone_verified ?? false}
          hasFullBio={hasFullBio}
          hasCity={hasCity}
          hasPortfolio={hasPortfolio}
          hasLink={hasLink}
          role={profile?.role ?? 'brand'}
        />

        {/* Phone Verification */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Phone Verification
            {profile?.phone_verified && (
              <span className="ml-2 badge bg-green-100 text-green-700 text-xs">✓ Verified</span>
            )}
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            We send a one-time code to your UK mobile number. This is the primary way we confirm you&apos;re a real person.
          </p>

          {profile?.phone_verified ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              ✓ Phone number verified: <strong>{profile.phone}</strong>
            </div>
          ) : (
            <div className="space-y-3">
              {!otpSent ? (
                <>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
                    <span className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-300 text-sm text-gray-600 shrink-0 select-none">
                      🇬🇧 +44
                    </span>
                    <input
                      type="tel"
                      className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                      placeholder="7700 900 000"
                      value={phone.replace(/^\+44/, '').replace(/^0/, '')}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={sendOtp}
                      className="btn-primary rounded-none shrink-0 border-l border-brand-600"
                      disabled={sendingOtp || !phone.trim()}
                    >
                      {sendingOtp ? 'Sending…' : 'Send code'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    🇬🇧 UK mobile numbers only (e.g. 07700 900 000)
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    A 6-digit code was sent to <strong>{phone}</strong>.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input flex-1 tracking-widest text-center font-mono"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    />
                    <button
                      onClick={verifyOtp}
                      className="btn-primary shrink-0"
                      disabled={verifyingOtp || otpCode.length < 6}
                    >
                      {verifyingOtp ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                  <button
                    onClick={() => { setOtpSent(false); setOtpCode('') }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Use a different number
                  </button>
                </div>
              )}
              {phoneError && <ErrorMessage message={phoneError} />}
            </div>
          )}
        </div>

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
              <div className="flex justify-between mt-1">
                <p className={`text-xs ${hasFullBio ? 'text-green-600' : 'text-gray-400'}`}>
                  {hasFullBio ? '✓ Good length' : `${bio.trim().length}/40 characters minimum`}
                </p>
              </div>
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
            {profileSuccess && <p className="text-sm text-green-600 font-medium">Profile saved!</p>}
            <button type="submit" className="btn-primary w-full" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>

        {/* Portfolio */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900">Portfolio Images</h2>
            {profile?.role === 'manufacturer' && (
              <span className={`text-xs font-semibold ${hasPortfolio ? 'text-green-600' : 'text-gray-400'}`}>
                {portfolio.length}/5 {hasPortfolio ? '✓' : 'required for Verified'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {profile?.role === 'manufacturer'
              ? 'Upload at least 5 photos of your factory, machinery, or finished garments to reach Verified status.'
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
                >×</button>
              </div>
            ))}
          </div>
          {portfolioError && <ErrorMessage message={portfolioError} />}
          <label className={`btn-secondary w-full cursor-pointer text-center ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploadingImage ? 'Uploading…' : '+ Upload image'}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadPortfolioImage} disabled={uploadingImage} />
          </label>
        </div>

        {/* Links */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Contact Links</h2>
          <p className="text-xs text-gray-500 mb-4">
            Add your Instagram, website, WhatsApp or email so{' '}
            {profile?.role === 'brand' ? 'manufacturers' : 'brands'} can contact you.
          </p>
          {links.length > 0 && (
            <div className="space-y-2 mb-4">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-sm text-gray-700">
                    {LINK_ICONS[link.type]} <strong>{LINK_LABELS[link.type]}</strong>: {link.url}
                  </span>
                  <button onClick={() => deleteLink(link.id)} className="text-red-500 text-xs hover:text-red-700 ml-2">Remove</button>
                </div>
              ))}
            </div>
          )}
          {linkError && <ErrorMessage message={linkError} />}
          <form onSubmit={addLink} className="flex flex-col sm:flex-row gap-2">
            <select className="input sm:w-36 shrink-0" value={newLinkType} onChange={(e) => setNewLinkType(e.target.value as LinkType)}>
              {LINK_TYPES.map((t) => (
                <option key={t} value={t}>{LINK_ICONS[t]} {LINK_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="text"
              className="input flex-1"
              placeholder={newLinkType === 'instagram' ? '@yourbrand' : newLinkType === 'whatsapp' ? '+447700000000' : newLinkType === 'email' ? 'you@example.com' : 'https://yourwebsite.com'}
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
