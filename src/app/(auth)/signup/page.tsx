'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ErrorMessage from '@/components/ui/ErrorMessage'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'brand' | 'manufacturer' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { setError('Please select your role.'); return }
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), role },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Trigger (handle_new_user) creates profiles row automatically.
      // Redirect based on role.
      router.push(role === 'brand' ? '/brand' : '/manufacturer')
      router.refresh()
    } else {
      // Email confirmation required
      setError('Check your email to confirm your account, then log in.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="card p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-1">Join the D4TF Connect marketplace</p>
        <p className="text-xs text-amber-600 font-medium mb-5">🇬🇧 UK-based businesses only</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selector */}
          <div>
            <label className="label">I am a…</label>
            <div className="grid grid-cols-2 gap-2">
              {(['brand', 'manufacturer'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`
                    p-3 rounded-lg border-2 text-sm font-medium capitalize transition-colors
                    ${role === r
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}
                  `}
                >
                  {r === 'brand' ? '🏷️ Brand' : '🏭 Manufacturer'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="name" className="label">
              {role === 'manufacturer' ? 'Factory / Business name' : 'Brand name'}
            </label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder={role === 'manufacturer' ? 'e.g. Atlas Garment Co.' : 'e.g. Velour Studio'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="At least 8 characters"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <ErrorMessage message={error} />}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
