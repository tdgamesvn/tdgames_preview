import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPresignedPutUrl } from '@/lib/r2'

export async function POST(request: NextRequest) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'internal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { key, contentType } = body as { key?: string; contentType?: string }
  if (!key || !contentType) {
    return NextResponse.json({ error: 'key and contentType are required' }, { status: 400 })
  }

  const url = await getPresignedPutUrl(key, contentType)
  return NextResponse.json({ url })
}
