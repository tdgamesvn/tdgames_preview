// src/lib/supabase/get-redirect-path.ts
import type { UserRole } from '@/lib/types/database'

/**
 * Determines where to redirect based on user role and current path.
 * Returns null if no redirect is needed (allow through).
 */
export function getRedirectPath(
  role: UserRole | null,
  pathname: string
): string | null {
  const isAuthed = role !== null

  // Public routes — always allow
  if (pathname.startsWith('/share/')) return null

  // Already on login → redirect if authed
  if (pathname === '/login') {
    return isAuthed ? '/' : null
  }

  // Root → role-based redirect
  if (pathname === '/') {
    if (role === 'internal') return '/dashboard'
    if (role === 'client') return '/portal'
    return '/login'
  }

  // Dashboard → internal only
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthed) return '/login'
    if (role === 'client') return '/portal'
    return null
  }

  // Portal → client or internal (internal can preview as client)
  if (pathname.startsWith('/portal')) {
    if (!isAuthed) return '/login'
    return null  // both 'client' and 'internal' may access portal pages
  }

  return null
}
