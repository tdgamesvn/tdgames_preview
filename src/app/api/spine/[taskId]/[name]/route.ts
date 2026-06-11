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
  request: NextRequest,
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

  // ETag = first 24 chars of the r2_key (unique per upload, changes when file is replaced).
  // This lets the browser cache the file body indefinitely while still detecting
  // replacements: a re-upload generates a new r2_key → new ETag → cache bust.
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
        // no-cache: browser must revalidate on every use, but can serve from
        // cache if ETag matches (304 → no body re-download).
        // When a file is replaced the r2_key changes → new ETag → full re-fetch.
        'Cache-Control': 'private, no-cache',
        ETag: etag,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
