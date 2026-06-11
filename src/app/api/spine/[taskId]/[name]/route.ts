import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getR2Object } from '@/lib/r2'

/**
 * Streams a Spine asset (.json / .atlas / .png) from R2 by task + file name.
 *
 * Why a proxy instead of presigned URLs: the Spine runtime resolves the texture
 * (.png) RELATIVE to the atlas URL using the image name written inside the
 * .atlas file. Presigned URLs carry a query string and the R2 keys are
 * timestamp-prefixed, so relative resolution breaks (texture 404). Serving every
 * Spine file under a clean, stable path (/api/spine/<taskId>/<name>) keeps the
 * json ↔ atlas ↔ png references intact.
 */
function contentTypeFor(name: string, fallback?: string): string {
  if (name.endsWith('.json')) return 'application/json'
  if (name.endsWith('.atlas')) return 'text/plain; charset=utf-8'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.webp')) return 'image/webp'
  return fallback || 'application/octet-stream'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { taskId: string; name: string } }
) {
  // Any authenticated user (internal or client) may stream Spine assets.
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = decodeURIComponent(params.name)
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: asset, error } = await admin
    .from('Prv_assets')
    .select('r2_key, name')
    .eq('task_id', params.taskId)
    .eq('name', name)
    .limit(1)
    .maybeSingle()

  if (error || !asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const obj = await getR2Object(asset.r2_key)
    if (!obj.body) return NextResponse.json({ error: 'Empty object' }, { status: 404 })

    return new NextResponse(obj.body, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(asset.name, obj.contentType),
        ...(obj.contentLength ? { 'Content-Length': String(obj.contentLength) } : {}),
        // No caching: files may be replaced (delete + re-upload same name).
        // A stale cached JSON/atlas/PNG causes Spine region-not-found errors.
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
