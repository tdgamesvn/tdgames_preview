import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: comments, error } = await supabase
    .from('Prv_comments')
    .select('id, content, asset_id, author_id, created_at')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = comments ?? []

  // Resolve author display names separately (no FK embed → avoids PostgREST 400)
  const authorIds = Array.from(
    new Set(rows.map((c: { author_id: string }) => c.author_id))
  ) as string[]
  let nameById: Record<string, string> = {}
  if (authorIds.length > 0) {
    const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await admin
      .from('Prv_profiles')
      .select('id, display_name')
      .in('id', authorIds)
    nameById = Object.fromEntries(
      (profiles ?? []).map((p: { id: string; display_name: string | null }) => [
        p.id,
        p.display_name ?? 'Unknown',
      ])
    )
  }

  const withNames = rows.map((c: { author_id: string }) => ({
    ...c,
    Prv_profiles: { display_name: nameById[c.author_id] ?? 'Unknown' },
  }))

  return NextResponse.json(withNames)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { content, asset_id } = body as { content?: string; asset_id?: string | null }
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await admin
    .from('Prv_comments')
    .insert({
      project_id: params.id,
      asset_id: asset_id ?? null,
      author_id: user.id,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
