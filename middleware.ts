// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import { getRedirectPath } from '@/lib/supabase/get-redirect-path'
import type { UserRole } from '@/lib/types/database'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  // Refresh session (keeps auth cookies up to date)
  const { data: { user } } = await supabase.auth.getUser()

  let role: UserRole | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('Prv_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: UserRole } | null; error: unknown }
    role = profile?.role ?? null
  }

  const pathname = request.nextUrl.pathname
  const redirectTo = getRedirectPath(role, pathname)

  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
