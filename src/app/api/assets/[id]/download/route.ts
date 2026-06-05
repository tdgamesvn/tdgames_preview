import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPresignedGetUrl } from '@/lib/r2'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Any authenticated user (internal or client) can download
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: asset, error } = await admin
    .from('Prv_assets')
    .select('id, r2_key, name, file_type')
    .eq('id', params.id)
    .single()

  if (error || !asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = await getPresignedGetUrl(asset.r2_key)
  return NextResponse.json({ url, filename: asset.name })
}
