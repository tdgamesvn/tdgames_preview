import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Use x-forwarded-host to build the correct public URL when behind nginx/Cloudflare.
  // request.url resolves to localhost:3001 internally — not the public domain.
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    'localhost:3001'
  const proto = request.headers.get('x-forwarded-proto') || 'http'
  return NextResponse.redirect(`${proto}://${host}/login`)
}
