/**
 * GET /api/share-comments/[token]
 * Returns comments for a project identified by its public share token.
 * No auth required — access is gated by share_token + share_enabled.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Validate share token
  const { data: project } = (await admin
    .from('Prv_projects')
    .select('id')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()) as { data: { id: string } | null }

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: comments, error } = await admin
    .from('Prv_comments')
    .select('id, content, asset_id, author_id, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (comments ?? []) as { author_id: string }[]

  // Resolve author display names
  const authorIds = Array.from(new Set(rows.map((c) => c.author_id))) as string[]
  let nameById: Record<string, string> = {}
  if (authorIds.length > 0) {
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

  const withNames = rows.map((c) => ({
    ...c,
    Prv_profiles: { display_name: nameById[c.author_id] ?? 'Unknown' },
  }))

  return NextResponse.json(withNames)
}
