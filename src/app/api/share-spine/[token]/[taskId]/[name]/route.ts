import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getR2Object } from '@/lib/r2'

function contentTypeFor(name: string, fallback?: string): string {
  if (name.endsWith('.json')) return 'application/json'
  if (name.endsWith('.atlas')) return 'text/plain; charset=utf-8'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.webp')) return 'image/webp'
  return fallback || 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string; taskId: string; name: string } }
) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Validate share token — must exist and be enabled
  const { data: project } = await admin
    .from('Prv_projects')
    .select('id')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const name = decodeURIComponent(params.name)

  const { data: asset } = await admin
    .from('Prv_assets')
    .select('r2_key, name')
    .eq('project_id', project.id)
    .eq('task_id', params.taskId)
    .eq('name', name)
    .limit(1)
    .maybeSingle()

  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const etag = `"${asset.r2_key.slice(0, 24)}"`
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
    })
  }

  try {
    const obj = await getR2Object(asset.r2_key)
    if (!obj.body) return NextResponse.json({ error: 'Empty object' }, { status: 404 })

    return new NextResponse(obj.body, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(asset.name, obj.contentType),
        ...(obj.contentLength ? { 'Content-Length': String(obj.contentLength) } : {}),
        'Cache-Control': 'private, no-cache',
        ETag: etag,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
