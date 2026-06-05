import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteR2Object } from '@/lib/r2'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'internal')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: asset, error: fetchError } = await admin
    .from('Prv_assets')
    .select('id, r2_key')
    .eq('id', params.id)
    .single()

  if (fetchError || !asset)
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

  try { await deleteR2Object(asset.r2_key) } catch { /* best-effort */ }

  const { error } = await admin.from('Prv_assets').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
