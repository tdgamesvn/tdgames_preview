// __tests__/lib/supabase-middleware.test.ts
import { getRedirectPath } from '@/lib/supabase/get-redirect-path'

describe('getRedirectPath', () => {
  it('unauthenticated user on /dashboard → /login', () => {
    expect(getRedirectPath(null, '/dashboard')).toBe('/login')
  })

  it('unauthenticated user on /portal → /login', () => {
    expect(getRedirectPath(null, '/portal')).toBe('/login')
  })

  it('internal user on /dashboard → null (allow)', () => {
    expect(getRedirectPath('internal', '/dashboard/clients')).toBeNull()
  })

  it('client user on /dashboard → /portal (wrong role)', () => {
    expect(getRedirectPath('client', '/dashboard')).toBe('/portal')
  })

  it('internal user on /portal → null (allowed, preview-as-client)', () => {
    expect(getRedirectPath('internal', '/portal')).toBeNull()
  })

  it('logged-in user on /login → / (already authed)', () => {
    expect(getRedirectPath('internal', '/login')).toBe('/')
  })

  it('unauthenticated user on /share/abc → null (public)', () => {
    expect(getRedirectPath(null, '/share/abc')).toBeNull()
  })

  it('root / → /dashboard for internal', () => {
    expect(getRedirectPath('internal', '/')).toBe('/dashboard')
  })

  it('root / → /portal for client', () => {
    expect(getRedirectPath('client', '/')).toBe('/portal')
  })
})
