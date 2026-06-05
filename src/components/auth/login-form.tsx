'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  monoFont?: string
}

export function LoginForm({ monoFont }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Hard redirect — forces full page reload so middleware sees fresh session cookie
    window.location.href = '/'
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Email */}
      <div className="fu2">
        <label className="form-label" htmlFor="email"
          style={{ fontFamily: monoFont }}>
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
        <label className="form-label" htmlFor="password"
          style={{ fontFamily: monoFont }}>
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
        <button
          type="submit"
          className="amber-btn"
          disabled={loading}
          style={{ fontFamily: monoFont ?? 'inherit' }}
        >
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
      </div>

      {/* Divider hint */}
      <div className="fu5" style={{
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(148,163,184,0.35)',
        fontFamily: monoFont,
        letterSpacing: '0.08em',
      }}>
        Credentials provided by your studio contact
      </div>
    </form>
  )
}
