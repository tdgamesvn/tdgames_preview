import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('Prv_comments')
    .select('id, content, asset_id, author_id, created_at, Prv_profiles(display_name)')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { content, asset_id } = body as { content?: string; asset_id?: string | null }
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const admin = createAdminClient() as any
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
