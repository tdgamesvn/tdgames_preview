import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPresignedGetUrl } from '@/lib/r2'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Any authenticated user (internal or client) can download
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: asset, error } = await admin
    .from('Prv_assets')
    .select('id, r2_key, name, file_type, service_type')
    .eq('id', params.id)
    .single()

  if (error || !asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ?variant=atlas → return presigned URL for the companion .atlas file
  const variant = request.nextUrl.searchParams.get('variant')
  if (variant === 'atlas') {
    // Derive atlas key: replace file extension with .atlas
    // e.g. assets/{id}/skeleton.json → assets/{id}/skeleton.atlas
    const atlasKey = asset.r2_key.replace(/\.[^./]+$/, '.atlas')
    const url = await getPresignedGetUrl(atlasKey)
    return NextResponse.json({ url, filename: asset.name + '.atlas' })
  }

  const url = await getPresignedGetUrl(asset.r2_key)
  return NextResponse.json({ url, filename: asset.name })
}
