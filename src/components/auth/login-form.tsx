'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Query role directly from client (session is set, RLS allows reading own profile)
    try {
      const userId = authData.user?.id
      const { data: profile } = (await supabase
        .from('Prv_profiles')
        .select('role')
        .eq('id', userId!)
        .single()) as { data: { role: string } | null }

      window.location.href = profile?.role === 'internal' ? '/dashboard' : '/portal'
    } catch {
      window.location.href = '/dashboard'
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Email */}
      <div className="fu2">
        <label className="form-label" htmlFor="email">
          Email Address
        </label>
        <input
          className="dark-input"
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      {/* Password */}
      <div className="fu3">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          className="dark-input"
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="fu3 form-error" role="alert">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="fu4">
        <button type="submit" className="amber-btn" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
      </div>

      {/* Hint */}
      <div className="fu5" style={{
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(157,156,157,0.35)',
        letterSpacing: '0.08em',
      }}>
        Credentials provided by your studio contact
      </div>
    </form>
  )
}
