import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicUrl } from '@/lib/r2'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Any authenticated user (internal or client) can download
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch asset + user profile in parallel
  const [{ data: asset, error }, { data: profile }] = await Promise.all([
    admin
      .from('Prv_assets')
      .select('id, r2_key, name, file_type, service_type, project_id')
      .eq('id', params.id)
      .single() as Promise<{ data: { id: string; r2_key: string; name: string; file_type: string; service_type: string; project_id: string } | null; error: unknown }>,
    admin
      .from('Prv_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as Promise<{ data: { role: string } | null }>,
  ])

  if (error || !asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // For client-role users, check whether downloads are enabled for this project
  if (profile?.role === 'client') {
    const { data: project } = await admin
      .from('Prv_projects')
      .select('allow_download')
      .eq('id', asset.project_id)
      .single() as Promise<{ data: { allow_download: boolean } | null }>
    if (project?.allow_download === false) {
      return NextResponse.json({ error: 'Downloads are disabled for this project' }, { status: 403 })
    }
  }

  // ?variant=atlas → return public URL for the companion .atlas file
  const variant = request.nextUrl.searchParams.get('variant')
  if (variant === 'atlas') {
    // Derive atlas key: replace file extension with .atlas
    // e.g. assets/{id}/skeleton.json → assets/{id}/skeleton.atlas
    const atlasKey = asset.r2_key.replace(/\.[^./]+$/, '.atlas')
    const url = getPublicUrl(atlasKey)
    return NextResponse.json({ url, filename: asset.name + '.atlas' })
  }

  const url = getPublicUrl(asset.r2_key)
  return NextResponse.json({ url, filename: asset.name })
}
